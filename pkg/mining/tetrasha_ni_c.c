/* tetrasha_ni_c — C accelerator for TetraSHA-NI (SHA-NI via OpenSSL).
 *
 * Byte-identical to pkg/mining/tetrasha_ni.py. OpenSSL's SHA256() dispatches
 * to SHA-NI instructions where the CPU flag exists (verified: sha_ni on
 * this box). No Python per-round overhead: the 128-round loop runs fully
 * in C, GIL released for batch work.
 */
#define PY_SSIZE_T_CLEAN
#include <Python.h>
#include <openssl/sha.h>
#include <stdint.h>
#include <string.h>

#define TSN_ROUNDS 128
#define TSN_WIDTH 4

static unsigned char tsn_prefix[TSN_ROUNDS][TSN_WIDTH][14]; /* "TetraSHA-NI"+LE16+branch */
static unsigned char tsn_rot[TSN_ROUNDS];

static void tsn_rotl_bytes(unsigned char *s, unsigned int rb) {
    unsigned char tmp[32];
    if (rb == 0 || rb >= 32) return;
    memcpy(tmp, s, 32);
    memcpy(s, tmp + rb, 32 - rb);
    memcpy(s + 32 - rb, tmp, rb);
}

/* out[32] = TetraSHA-NI(in). Must match the Python reference exactly. */
static void tsn_hash_raw(const unsigned char *in, size_t inlen,
                         unsigned char out[32], int rounds) {
    unsigned char s[32], h[TSN_WIDTH][32];
    SHA256_CTX ctx;
    int r, b, i;

    SHA256_Init(&ctx);
    SHA256_Update(&ctx, "TetraSHA-NI-INIT", 16);
    SHA256_Update(&ctx, in, inlen);
    SHA256_Final(s, &ctx);

    for (r = 0; r < rounds; r++) {
        for (b = 0; b < TSN_WIDTH; b++) {
            SHA256_Init(&ctx);
            SHA256_Update(&ctx, tsn_prefix[r][b], 14);
            SHA256_Update(&ctx, s, 32);
            SHA256_Final(h[b], &ctx);
        }
        /* T = H0^H1^H2^H3 ^ S  (fold + Davies-Meyer-style feedforward) */
        for (i = 0; i < 32; i++)
            s[i] = (unsigned char)(h[0][i] ^ h[1][i] ^ h[2][i] ^ h[3][i] ^ s[i]);
        tsn_rotl_bytes(s, tsn_rot[r]);
    }

    SHA256_Init(&ctx);
    SHA256_Update(&ctx, "TetraSHA-NI-FINAL", 17);
    SHA256_Update(&ctx, s, 32);
    SHA256_Final(out, &ctx);
}

static PyObject *tsn_hash(PyObject *self, PyObject *args, PyObject *kw) {
    static char *kwlist[] = {"data", "rounds", NULL};
    const unsigned char *in;
    Py_ssize_t inlen;
    int rounds = TSN_ROUNDS;
    unsigned char out[32];
    if (!PyArg_ParseTupleAndKeywords(args, kw, "y#|i", kwlist, &in, &inlen, &rounds))
        return NULL;
    if (rounds < 1 || rounds > TSN_ROUNDS) {
        PyErr_SetString(PyExc_ValueError, "rounds must be 1..128");
        return NULL;
    }
    Py_BEGIN_ALLOW_THREADS
    tsn_hash_raw(in, (size_t)inlen, out, rounds);
    Py_END_ALLOW_THREADS
    return PyBytes_FromStringAndSize((const char *)out, 32);
}

static PyObject *tsn_hash_batch(PyObject *self, PyObject *args, PyObject *kw) {
    static char *kwlist[] = {"datas", "rounds", NULL};
    PyObject *seq, *fast, *result;
    int rounds = TSN_ROUNDS;
    Py_ssize_t n, i;
    unsigned char *outs;
    int bad = 0;
    if (!PyArg_ParseTupleAndKeywords(args, kw, "O|i", kwlist, &seq, &rounds))
        return NULL;
    if (rounds < 1 || rounds > TSN_ROUNDS) {
        PyErr_SetString(PyExc_ValueError, "rounds must be 1..128");
        return NULL;
    }
    fast = PySequence_Fast(seq, "datas must be a sequence of bytes");
    if (!fast) return NULL;
    n = PySequence_Fast_GET_SIZE(fast);
    /* Snapshot raw pointers first (needs GIL), hash into C buffer (no GIL). */
    const unsigned char **ptrs = (const unsigned char **)PyMem_Malloc(
        (n > 0 ? n : 1) * sizeof(*ptrs));
    Py_ssize_t *lens = (Py_ssize_t *)PyMem_Malloc(
        (n > 0 ? n : 1) * sizeof(*lens));
    outs = (unsigned char *)PyMem_Malloc((n > 0 ? n : 1) * 32);
    if (!ptrs || !lens || !outs) {
        PyMem_Free(ptrs); PyMem_Free(lens); PyMem_Free(outs);
        Py_DECREF(fast);
        return PyErr_NoMemory();
    }
    for (i = 0; i < n; i++) {
        PyObject *item = PySequence_Fast_GET_ITEM(fast, i);
        char *buf; Py_ssize_t buflen;
        if (PyBytes_AsStringAndSize(item, &buf, &buflen) < 0) { bad = 1; break; }
        ptrs[i] = (const unsigned char *)buf;
        lens[i] = buflen;
    }
    if (!bad) {
        Py_BEGIN_ALLOW_THREADS
        for (i = 0; i < n; i++)
            tsn_hash_raw(ptrs[i], (size_t)lens[i], outs + 32 * i, rounds);
        Py_END_ALLOW_THREADS
    }
    PyMem_Free(ptrs); PyMem_Free(lens);
    Py_DECREF(fast);
    if (bad) { PyMem_Free(outs); return NULL; }
    result = PyList_New(n);
    if (!result) { PyMem_Free(outs); return PyErr_NoMemory(); }
    for (i = 0; i < n; i++) {
        PyObject *b = PyBytes_FromStringAndSize((const char *)(outs + 32 * i), 32);
        if (!b) { Py_DECREF(result); PyMem_Free(outs); return NULL; }
        PyList_SET_ITEM(result, i, b);
    }
    PyMem_Free(outs);
    return result;
}

static PyMethodDef tsn_methods[] = {
    {"hash", (PyCFunction)(void *)tsn_hash, METH_VARARGS | METH_KEYWORDS,
     "hash(data, rounds=128) -> 32-byte TetraSHA-NI digest"},
    {"hash_batch", (PyCFunction)(void *)tsn_hash_batch, METH_VARARGS | METH_KEYWORDS,
     "hash_batch([data...], rounds=128) -> [digests]"},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef tsn_module = {
    PyModuleDef_HEAD_INIT, "tetrasha_ni_c",
    "C accelerator for TetraSHA-NI (OpenSSL SHA-NI path).", -1, tsn_methods
};

PyMODINIT_FUNC PyInit_tetrasha_ni_c(void) {
    int r, b;
    for (r = 0; r < TSN_ROUNDS; r++) {
        for (b = 0; b < TSN_WIDTH; b++) {
            memcpy(tsn_prefix[r][b], "TetraSHA-NI", 11);
            tsn_prefix[r][b][11] = (unsigned char)((r + 1) & 0xff);
            tsn_prefix[r][b][12] = (unsigned char)(((r + 1) >> 8) & 0xff);
            tsn_prefix[r][b][13] = (unsigned char)b;
        }
        tsn_rot[r] = (unsigned char)((r + 1) % 32);
    }
    return PyModule_Create(&tsn_module);
}
