from setuptools import setup, Extension

setup(
    name="tetrasha_ni_c",
    version="0.1.0",
    ext_modules=[
        Extension(
            "tetrasha_ni_c",
            sources=["pkg/mining/tetrasha_ni_c.c"],
            libraries=["crypto"],
        )
    ],
)
