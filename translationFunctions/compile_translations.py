#!/usr/bin/env python
"""
Compile .po files to .mo files without requiring gettext tools.
Uses polib library if available, otherwise provides instructions.
"""
import os
import sys
from pathlib import Path

try:
    import polib
    HAS_POLIB = True
except ImportError:
    HAS_POLIB = False

def compile_po_to_mo(po_path, mo_path):
    """Compile a .po file to .mo file using polib."""
    if not HAS_POLIB:
        print("Error: polib library not found.")
        print("Install it with: pip install polib")
        return False
    
    try:
        po = polib.pofile(po_path)
        po.save_as_mofile(mo_path)
        print(f"✓ Compiled: {po_path} -> {mo_path}")
        return True
    except Exception as e:
        print(f"✗ Error compiling {po_path}: {e}")
        return False

def main():
    base_dir = Path(__file__).parent
    locale_dir = base_dir / 'locale'
    
    if not locale_dir.exists():
        print(f"Error: locale directory not found at {locale_dir}")
        return 1
    
    if not HAS_POLIB:
        print("=" * 60)
        print("polib library is required to compile translations.")
        print("Install it with: pip install polib")
        print("=" * 60)
        return 1
    
    languages = ['de', 'kk', 'lv', 'pl', 'ru']
    compiled = 0
    failed = 0
    
    for lang in languages:
        po_file = locale_dir / lang / 'LC_MESSAGES' / 'django.po'
        mo_file = locale_dir / lang / 'LC_MESSAGES' / 'django.mo'
        
        if not po_file.exists():
            print(f"⚠ Warning: {po_file} not found, skipping...")
            continue
        
        if compile_po_to_mo(po_file, mo_file):
            compiled += 1
        else:
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Compilation complete: {compiled} succeeded, {failed} failed")
    print("=" * 60)
    
    return 0 if failed == 0 else 1

if __name__ == '__main__':
    sys.exit(main())

