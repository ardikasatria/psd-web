"""Template notebook kosong untuk record baru."""
from __future__ import annotations

BLANK_NOTEBOOK = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": ["# Notebook baru di PSD\n", "\n", "Selamat menulis kode — autosave aktif.\n"],
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": ["# Selamat datang\n", "print('Halo PSD')\n"],
        },
    ],
    "metadata": {
        "kernelspec": {
            "display_name": "Python (Pyodide)",
            "language": "python",
            "name": "python3",
        },
        "language_info": {"name": "python", "version": "3.12"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}


def blank_notebook() -> dict:
    import copy

    return copy.deepcopy(BLANK_NOTEBOOK)
