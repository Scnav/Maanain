"""
Banco de dados de assinaturas de malware
Contém padrões conhecidos de arquivos maliciosos
"""

# Extensões de arquivos potencialmente perigosos
DANGEROUS_EXTENSIONS = [
    '.exe', '.dll', '.bat', '.cmd', '.com', '.pif', '.scr',
    '.vbs', '.js', '.jse', '.wsf', '.wsh', '.ps1', '.psm1',
    '.sh', '.bash', '.bin', '.run', '.elf',
    '.jar', '.class', '.apk', '.app',
    '.hta', '.msi', '.msp', '.cab',
    '.reg', '.inf', '.sys', '.drv',
    '.ocx', '.ax', '.cpl', '.efi',
    '.mime', '.sct', '.wallpaper', '.theme'
]

# Extensões de script que podem ser perigosas
SCRIPT_EXTENSIONS = [
    '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py',
    '.rb', '.lua', '.tcl', '.perl', '.bash', '.sh'
]

# Extensões de documento potencialmente perigosas
DOCUMENT_EXTENSIONS = [
    '.doc', '.docm', '.docx', '.dotm', '.dot',
    '.xls', '.xlsm', '.xlsx', '.xlst',
    '.ppt', '.pptm', '.pptx', '.ppsm',
    '.pdf', '.odt', '.ods', '.odp'
]

# Assinaturas de bytes (hex) para detecção de malware conhecido
# Formato: (hex_signature, description, threat_name)
BYTE_SIGNATURES = [
    # Virus indicadores comuns
    (b'MZ', 'PE Executable', 'Executable File'),
    (b'\\x4d\\x5a', 'PE Executable (alt)', 'Executable File'),
    
    # Scripts maliciosos
    (b'#!/bin/sh', 'Shell Script', 'Shell Script'),
    (b'#!/usr/bin', 'Unix Script', 'Unix Script'),
    (b'#!', 'Script Shebang', 'Script File'),
    
    # VBA Macros maliciosas
    (b'AttributableExpression', 'VBA Macro', 'Office Macro'),
    (b'VBA_PROJECT', 'VBA Project', 'Office Macro'),
    (b'PK\\x03\\x04', 'Office Document (ZIP)', 'Office Document'),
    
    # Scripts Embedded
    (b'<script', 'JavaScript Embedded', 'Script Injection'),
    (b'<php', 'PHP Script', 'PHP Script'),
    (b'<%', 'ASP Script', 'ASP Script'),
    
    # Java/Jar
    (b'\\xca\\xfe\\xba\\xbe', 'Java Class', 'Java Malware'),
    (b'PK\\x03\\x04', 'JAR Archive', 'JAR Malware'),
    
    # Python
    (b'#!/usr/bin/python', 'Python Script', 'Python Script'),
    (b'# -*- coding:', 'Python Script', 'Python Script'),
    
    # Shell scripts
    (b'#!/bin/bash', 'Bash Script', 'Bash Malware'),
    (b'#!/bin/sh', 'Shell Script', 'Shell Malware'),
    
    # Powershell
    (b'# -*- coding:', 'PowerShell', 'PowerShell Script'),
    (b'$PSVersionTable', 'PowerShell', 'PowerShell Script'),
    
    # Executables
    (b'\\x7fELF', 'Linux ELF', 'Linux Executable'),
    
    # Android
    (b'dex\\n', 'Android DEX', 'Android Malware'),
    (b'dex\\r', 'Android DEX', 'Android Malware'),
]

# Nomes de arquivos suspeitos conhecidos
SUSPICIOUS_FILENAMES = [
    'autorun.inf',
    'autorun.exe',
    'setup.exe',
    'install.exe',
    'update.exe',
    'update.exe',
    'crack.exe',
    'keygen.exe',
    'patch.exe',
    'loader.exe',
    'free.exe',
    '破解.exe',  # Chinese crack
    'クラック.exe',  # Japanese crack
    'hack.exe',
    'hacker.exe',
    'virus.exe',
    'malware.exe',
    'trojan.exe',
    'backdoor.exe',
    'keylogger.exe',
    'stealer.exe',
    'miner.exe',
    'cryptominer.exe',
    'payload.exe',
    'shell.exe',
    'reverse.exe',
    'bind.exe',
    'stub.exe',
    'dropper.exe',
    'injector.exe',
    'logger.exe',
    'spyer.exe',
    'browsers.dll',
    'hook.dll',
    'keyboard.dll',
    'passwd.exe',
    'passwords.exe',
    'credentials.exe',
]

# Padrões de URLs maliciosas
MALICIOUS_URL_PATTERNS = [
    'malware',
    'virus',
    'trojan',
    'phishing',
    'hack',
    'crack',
    'free-download',
    'download-free',
    'cracked',
    'keygen',
    'serial',
    'warez',
    'xxx',
    'porn',
    'adult',
    'casino',
    'bet',
    'gambling',
    'lottery',
    'win-free',
    'click-here',
    'act-now',
    'limited-time',
    'free-gift',
    'prize',
    'winner',
    'congratulations',
    'your-computer',
    'infected',
    'security-alert',
    'microsoft-support',
    'apple-support',
    'bank-login',
    'verify-account',
    'update-payment',
    'suspended-account',
]

# Phishing keywords em URLs
PHISHING_KEYWORDS = [
    'login',
    'signin',
    'verify',
    'secure',
    'account',
    'update',
    'confirm',
    'banking',
    'paypal',
    'amazon',
    'apple',
    'microsoft',
    'google',
    'facebook',
    'netflix',
    'instagram',
    'twitter',
    'bank',
    'wallet',
    'payment',
    'invoice',
    'support',
    'help',
    'customer',
    'service',
]

# Known malicious domains (exemplos para demo)
KNOWN_MALICIOUS_DOMAINS = [
    'malware-test.com',
    'virus-test.com',
    'phishing-test.net',
    'suspicious-site.org',
]

# Categorias de ameaça
THREAT_CATEGORIES = {
    'trojan': 'Trojan Horse',
    'virus': 'Virus',
    'worm': 'Worm',
    'ransomware': 'Ransomware',
    'spyware': 'Spyware',
    'adware': 'Adware',
    'backdoor': 'Backdoor',
    'keylogger': 'Keylogger',
    'miner': 'Cryptocurrency Miner',
    'dropper': 'Dropper',
    'rootkit': 'Rootkit',
    'botnet': 'Botnet',
    'phishing': 'Phishing',
    'exploit': 'Exploit',
    'macro': 'Macro Malware',
    'script': 'Script Malware',
}

def get_extension_category(ext):
    """Retorna a categoria de extensão"""
    ext = ext.lower()
    if ext in DANGEROUS_EXTENSIONS:
        return 'executable'
    elif ext in SCRIPT_EXTENSIONS:
        return 'script'
    elif ext in DOCUMENT_EXTENSIONS:
        return 'document'
    elif ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico', '.webp']:
        return 'image'
    elif ext in ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma']:
        return 'audio'
    elif ext in ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm']:
        return 'video'
    elif ext in ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2']:
        return 'archive'
    elif ext in ['.txt', '.md', '.log', '.json', '.xml', '.csv', '.ini', '.cfg']:
        return 'text'
    else:
        return 'other'
