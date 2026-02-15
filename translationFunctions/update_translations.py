#!/usr/bin/env python
"""
Update all .po files with missing translation strings.
"""
import re
from pathlib import Path

# Translations for new strings
TRANSLATIONS = {
    'de': {
        'Username': 'Benutzername',
        'username': 'benutzername',
        'JWT-based authentication with secure token storage.': 'JWT-basierte Authentifizierung mit sicherer Token-Speicherung.',
        'Upload PDF CV': 'PDF-Lebenslauf hochladen',
    },
    'ru': {
        'Username': 'Имя пользователя',
        'username': 'имя пользователя',
        'JWT-based authentication with secure token storage.': 'Аутентификация на основе JWT с безопасным хранением токенов.',
        'Upload PDF CV': 'Загрузить PDF резюме',
    },
    'kk': {
        'Username': 'Пайдаланушы аты',
        'username': 'пайдаланушы аты',
        'JWT-based authentication with secure token storage.': 'JWT негізіндегі аутентификация қауіпсіз токен сақтаумен.',
        'Upload PDF CV': 'PDF резюме жүктеу',
    },
    'lv': {
        'Username': 'Lietotājvārds',
        'username': 'lietotājvārds',
        'JWT-based authentication with secure token storage.': 'JWT balstīta autentifikācija ar drošu tokenu glabāšanu.',
        'Upload PDF CV': 'Augšupielādēt PDF CV',
    },
    'pl': {
        'Username': 'Nazwa użytkownika',
        'username': 'nazwa użytkownika',
        'JWT-based authentication with secure token storage.': 'Uwierzytelnianie oparte na JWT z bezpiecznym przechowywaniem tokenów.',
        'Upload PDF CV': 'Prześlij CV w formacie PDF',
    },
}

def update_po_file(po_path, lang_code):
    """Update a .po file with missing strings."""
    with open(po_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove old Email and Forgot password entries
    content = re.sub(r'#: .*base\.html:57\nmsgid "Email"\nmsgstr "[^"]*"\n\n', '', content)
    content = re.sub(r'#: .*base\.html:58\nmsgid "you@example\.com"\nmsgstr "[^"]*"\n\n', '', content)
    content = re.sub(r'#: .*base\.html:73\nmsgid "Forgot password\?"\nmsgstr "[^"]*"\n\n', '', content)
    content = re.sub(r'#: .*base\.html:77\nmsgid "Demo mode only[^"]*"\nmsgstr "[^"]*"\n\n', '', content)
    
    # Add new strings before the last entry
    new_entries = []
    translations = TRANSLATIONS.get(lang_code, {})
    
    new_entries.append('\n#: .\\core\\templates\\core\\base.html:59\n')
    new_entries.append('msgid "Username"\n')
    new_entries.append(f'msgstr "{translations.get("Username", "Username")}"\n\n')
    
    new_entries.append('#: .\\core\\templates\\core\\base.html:60\n')
    new_entries.append('msgid "username"\n')
    new_entries.append(f'msgstr "{translations.get("username", "username")}"\n\n')
    
    new_entries.append('#: .\\core\\templates\\core\\base.html:78\n')
    new_entries.append('msgid "JWT-based authentication with secure token storage."\n')
    new_entries.append(f'msgstr "{translations.get("JWT-based authentication with secure token storage.", "JWT-based authentication with secure token storage.")}"\n\n')
    
    # Find where to insert (before chat.html entries or at end)
    if '#: .\\core\\templates\\core\\chat.html:87' in content:
        insert_pos = content.find('#: .\\core\\templates\\core\\chat.html:87')
        new_entries.append('#: .\\core\\templates\\core\\chat.html:87\n')
        new_entries.append('msgid "Upload PDF CV"\n')
        new_entries.append(f'msgstr "{translations.get("Upload PDF CV", "Upload PDF CV")}"\n\n')
        content = content[:insert_pos] + ''.join(new_entries) + content[insert_pos:]
    else:
        content += '\n' + ''.join(new_entries)
    
    with open(po_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Updated: {po_path}")

def main():
    base_dir = Path(__file__).parent
    locale_dir = base_dir / 'locale'
    
    languages = ['de', 'kk', 'lv', 'pl', 'ru']
    
    for lang in languages:
        po_file = locale_dir / lang / 'LC_MESSAGES' / 'django.po'
        if po_file.exists():
            update_po_file(po_file, lang)
        else:
            print(f"⚠ Warning: {po_file} not found")
    
    print("\n✓ All .po files updated!")
    print("Now run: python compile_translations.py")

if __name__ == '__main__':
    main()

