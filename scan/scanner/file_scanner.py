"""
Scanner de Arquivos Locais
Escaneia arquivos em busca de malware e padrões suspeitos
"""

import os
import hashlib
import mimetypes
from pathlib import Path
from .signatures import (
    DANGEROUS_EXTENSIONS,
    SUSPICIOUS_FILENAMES,
    BYTE_SIGNATURES,
    get_extension_category
)

class FileScanner:
    """Scanner de arquivos locais para detecção de malware"""
    
    def __init__(self):
        self.scanned_files = []
        self.threats_found = []
        self.file_count = 0
        self.threat_count = 0
        
    def calculate_hash(self, filepath, algorithm='sha256'):
        """Calcula o hash de um arquivo"""
        try:
            hash_func = hashlib.new(algorithm)
            with open(filepath, 'rb') as f:
                # Ler em chunks para arquivos grandes
                while chunk := f.read(8192):
                    hash_func.update(chunk)
            return hash_func.hexdigest()
        except Exception:
            return None
    
    def get_file_info(self, filepath):
        """Obtém informações sobre o arquivo"""
        try:
            stat = os.stat(filepath)
            return {
                'name': os.path.basename(filepath),
                'path': filepath,
                'size': stat.st_size,
                'extension': Path(filepath).suffix.lower(),
                'category': get_extension_category(Path(filepath).suffix.lower()),
                'modified': stat.st_mtime,
                'created': stat.st_ctime,
            }
        except Exception as e:
            return {'name': filepath, 'error': str(e)}
    
    def scan_file_content(self, filepath):
        """Escaneia o conteúdo do arquivo em busca de padrões suspeitos"""
        threats = []
        
        try:
            # Tentar ler os primeiros bytes para detecção de assinatura
            with open(filepath, 'rb') as f:
                header = f.read(1024)
                
            # Verificar assinaturas de bytes
            for signature, desc, threat_name in BYTE_SIGNATURES:
                if signature in header:
                    threats.append(f"Assinatura detectada: {desc} ({threat_name})")
                    
        except Exception:
            pass
            
        return threats
    
    def analyze_filename(self, filename):
        """Analisa o nome do arquivo em busca de padrões suspeitos"""
        threats = []
        filename_lower = filename.lower()
        
        # Verificar nomes suspeitos
        for suspicious_name in SUSPICIOUS_FILENAMES:
            if suspicious_name.lower() in filename_lower:
                threats.append(f"Nome suspeito: {suspicious_name}")
                
        # Verificar extensões duplas (técnica comum de malware)
        if '.' in filename:
            parts = filename.split('.')
            if len(parts) > 2:
                # Exemplo: arquivo.pdf.exe
                ext = parts[-1].lower()
                second_ext = parts[-2].lower()
                
                # Extensões que geralmente são seguras mas podem ocultar malware
                if ext in DANGEROUS_EXTENSIONS and second_ext in ['pdf', 'doc', 'jpg', 'png', 'mp3', 'mp4']:
                    threats.append(f"Extensão dupla suspeita: .{second_ext}.{ext}")
                    
        # Verificar caracteres suspeitos no nome
        suspicious_chars = [' ', '  ', '\\x00', '\0']
        for char in suspicious_chars:
            if char in filename:
                threats.append(f"Caractere suspeito no nome: {repr(char)}")
                
        return threats
    
    def analyze_file_size(self, filepath, size):
        """Analisa o tamanho do arquivo"""
        warnings = []
        
        # Arquivos muito pequenos podem ser stubs ou droppers
        if size < 100:
            warnings.append("Arquivo muito pequeno (< 100 bytes)")
            
        # Arquivos extremamente grandes podem ser ransomwares
        # ou dados roubados sendo exfiltrados
        if size > 100 * 1024 * 1024:  # > 100MB
            warnings.append("Arquivo muito grande (> 100MB)")
            
        return warnings
    
    def scan_file(self, filepath):
        """Escaneia um arquivo individual"""
        if not os.path.isfile(filepath):
            return {'file': filepath, 'status': 'error', 'threats': ['Não é um arquivo']}
            
        file_info = self.get_file_info(filepath)
        threats = []
        warnings = []
        
        # Analisar nome do arquivo
        filename_threats = self.analyze_filename(file_info['name'])
        threats.extend(filename_threats)
        
        # Analisar conteúdo
        content_threats = self.scan_file_content(filepath)
        threats.extend(content_threats)
        
        # Analisar tamanho
        size_warnings = self.analyze_file_size(filepath, file_info['size'])
        warnings.extend(size_warnings)
        
        # Calcular hash
        file_hash = self.calculate_hash(filepath)
        
        # Verificar extensão perigosa
        if file_info['extension'] in DANGEROUS_EXTENSIONS:
            warnings.append(f"Extensão potencialmente perigosa: {file_info['extension']}")
        
        result = {
            'file': filepath,
            'name': file_info['name'],
            'size': file_info['size'],
            'extension': file_info['extension'],
            'category': file_info['category'],
            'hash': file_hash,
            'threats': threats,
            'warnings': warnings,
            'status': 'infected' if threats else ('suspicious' if warnings else 'clean')
        }
        
        return result
    
    def scan_directory(self, directory, recursive=True, max_depth=10):
        """Escaneia um diretório completo"""
        results = {
            'directory': directory,
            'total_files': 0,
            'clean_files': 0,
            'suspicious_files': 0,
            'threats_found': 0,
            'threats': [],
            'files': []
        }
        
        if not os.path.exists(directory):
            results['error'] = f"Diretório não encontrado: {directory}"
            return results
            
        if not os.path.isdir(directory):
            results['error'] = f"Não é um diretório: {directory}"
            return results
        
        # Percorrer diretório
        for root, dirs, files in os.walk(directory):
            # Verificar profundidade
            depth = root.replace(directory, '').count(os.sep)
            if depth > max_depth and not recursive:
                continue
                
            for filename in files:
                filepath = os.path.join(root, filename)
                results['total_files'] += 1
                
                # Escanear arquivo
                file_result = self.scan_file(filepath)
                results['files'].append(file_result)
                
                # Atualizar contadores
                if file_result['status'] == 'infected':
                    results['threats_found'] += 1
                    results['threats'].append({
                        'file': filepath,
                        'threats': file_result['threats']
                    })
                elif file_result['status'] == 'suspicious':
                    results['suspicious_files'] += 1
                else:
                    results['clean_files'] += 1
                    
        return results
    
    def scan_multiple_paths(self, paths):
        """Escaneia múltiplos caminhos"""
        all_results = []
        
        for path in paths:
            if os.path.isfile(path):
                result = self.scan_file(path)
                all_results.append(result)
            elif os.path.isdir(path):
                result = self.scan_directory(path)
                all_results.append(result)
                
        return all_results
    
    def get_scan_summary(self, results):
        """Gera um resumo do scan"""
        return {
            'total': results['total_files'],
            'clean': results['clean_files'],
            'suspicious': results['suspicious_files'],
            'infected': results['threats_found'],
            'infection_rate': (results['threats_found'] / results['total_files'] * 100) 
                              if results['total_files'] > 0 else 0
        }
