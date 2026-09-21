; caduceus.inc — AQAI Caduceus opcode macros (NASM host assembler)
; Encoding is illustrative for the /chipset lab decoder (v0.1).

%ifndef AQAI_CADUCEUS_INC
%define AQAI_CADUCEUS_INC

; Major opcode nibble in bits [31:28]
%define OPC_CAD   0xC
%define OPC_ALU   0xA
%define OPC_MEM   0x8
%define OPC_CTL   0x0

%define FUN_BRAID    0x01
%define FUN_REFLECT  0x02
%define FUN_SEAL     0x03
%define FUN_PHONON   0x04
%define FUN_TAROT    0x05
%define FUN_HEX      0x06
%define FUN_OCT      0x07
%define FUN_SKIN     0x08
%define FUN_EP       0x09
%define FUN_POM      0x0A
%define FUN_VERIFY   0x0B
%define FUN_SPHINX   0x0C
%define FUN_LATTICE  0x0D
%define FUN_COMMIT   0x0E
%define FUN_UNITY    0x10
%define FUN_SCHNORR  0x11
%define FUN_NOP      0x00
%define FUN_HALT     0x0F

; Pack R-type: [31:28]=opc [27:20]=fun [19:15]=rd [14:10]=rs1 [9:5]=rs2
%macro CAD_R 4 ; opc_fun_as_byte_pair not used; use fun, rd, rs1, rs2
  dd (OPC_CAD << 28) | (%1 << 20) | (%2 << 15) | (%3 << 10) | (%4 << 5)
%endmacro

%macro CAD_BRAID 3 ; rd, rs1, rs2
  CAD_R FUN_BRAID, %1, %2, %3
%endmacro

%macro CAD_REFLECT 2 ; rd, rs1
  CAD_R FUN_REFLECT, %1, %2, 0
%endmacro

%macro CAD_SEAL 3 ; rd, rs1, rs2
  CAD_R FUN_SEAL, %1, %2, %3
%endmacro

%macro CAD_TAROT 2 ; rd, rs1
  CAD_R FUN_TAROT, %1, %2, 0
%endmacro

%macro CAD_OCT 3
  CAD_R FUN_OCT, %1, %2, %3
%endmacro

%macro CAD_SKIN 2
  CAD_R FUN_SKIN, %1, %2, 0
%endmacro

%macro CAD_EP 3
  CAD_R FUN_EP, %1, %2, %3
%endmacro

%macro CAD_POM 2
  CAD_R FUN_POM, %1, %2, 0
%endmacro

%macro CAD_VERIFY 3
  CAD_R FUN_VERIFY, %1, %2, %3
%endmacro

%macro CAD_SPHINX 3
  CAD_R FUN_SPHINX, %1, %2, %3
%endmacro

%macro CAD_LATTICE 3
  CAD_R FUN_LATTICE, %1, %2, %3
%endmacro

%macro CAD_COMMIT 2
  CAD_R FUN_COMMIT, %1, %2, 0
%endmacro

%macro CAD_UNITY 2 ; rd, rs1 — f(x)=cos(0), anchor x=1
  CAD_R FUN_UNITY, %1, %2, 0
%endmacro

%macro CAD_SCHNORR 3 ; rd, rs1, rs2 — BIP340 verify bit
  CAD_R FUN_SCHNORR, %1, %2, %3
%endmacro

%macro CAD_HALT 0
  CAD_R FUN_HALT, 0, 0, 0
%endmacro

%endif
