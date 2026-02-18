"""
Scanner de URLs e Domínios
Verifica se URLs/domínios são maliciosos ou phishing
"""

import socket
import re
import hashlib
from urllib.parse import urlparse
from .signatures import (
    MALICIOUS_URL_PATTERNS,
    PHISHING_KEYWORDS,
    KNOWN_MALICIOUS_DOMAINS
)

class URLScanner:
    """Scanner de URLs e domínios para detecção de malware e phishing"""
    
    def __init__(self):
        self.checked_urls = []
        
    def parse_url(self, url):
        """Parseia uma URL e extrai componentes"""
        try:
            parsed = urlparse(url)
            return {
                'scheme': parsed.scheme,
                'netloc': parsed.netloc,
                'hostname': parsed.hostname,
                'port': parsed.port,
                'path': parsed.path,
                'params': parsed.params,
                'query': parsed.query,
                'fragment': parsed.fragment
            }
        except Exception as e:
            return {'error': str(e)}
    
    def extract_domain(self, url):
        """Extrai o domínio de uma URL"""
        parsed = self.parse_url(url)
        if 'hostname' in parsed:
            return parsed['hostname']
        return None
    
    def check_domain_reputation(self, domain):
        """Verifica a reputação de um domínio"""
        reputation = 'unknown'
        risk_level = 0
        details = {}
        
        # Verificar domínio malicioso conhecido
        if domain.lower() in [d.lower() for d in KNOWN_MALICIOUS_DOMAINS]:
            reputation = 'malicious'
            risk_level = 100
            details['reason'] = 'Domínio malicioso conhecido'
            return reputation, risk_level, details
        
        # Verificar idade do domínio (simulado - em produção usaria WHOIS)
        # Aqui verificamos apenas se o domínio resolve
        try:
            socket.gethostbyname(domain)
            details['dns_resolves'] = True
            reputation = 'neutral'
        except socket.gaierror:
            details['dns_resolves'] = False
            reputation = 'suspicious'
            risk_level += 30
            
        # Verificar TLD
        tld = domain.split('.')[-1] if '.' in domain else ''
        suspicious_tlds = ['xyz', 'top', 'work', 'click', 'link', 'buzz', 'gq', 'ml', 'tk', 'cf', 'ga']
        if tld.lower() in suspicious_tlds:
            risk_level += 20
            details['suspicious_tld'] = tld
            
        return reputation, risk_level, details
    
    def analyze_url_structure(self, url):
        """Analisa a estrutura da URL para detectar padrões suspeitos"""
        warnings = []
        score = 0
        
        parsed = self.parse_url(url)
        if 'error' in parsed:
            return warnings, 0
            
        # Verificar comprimento excessivo
        if len(url) > 200:
            warnings.append("URL muito longa")
            score += 10
            
        # Verificar IP direto ao invés de domínio
        ip_pattern = r'^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$'
        if parsed.get('hostname') and re.match(ip_pattern, parsed['hostname']):
            warnings.append("URL usa endereço IP direto")
            score += 25
            
        # Verificar subdomain excessivo
        if parsed.get('hostname'):
            parts = parsed['hostname'].split('.')
            if len(parts) > 4:
                warnings.append("Muitos subdomínios")
                score += 15
                
        # Verificar @ symbol (uso comum em phishing)
        if '@' in url:
            warnings.append("URL contém @ - possível phishing")
            score += 30
            
        # Verificar redirecionamento (//)
        if '//' in parsed.get('path', ''):
            warnings.append("URL contém // no path - possível redirecionamento")
            score += 15
            
        # Verificar encoded characters
        if '%' in url and '%20' in url:
            warnings.append("URL contém espaços codificados")
            score += 10
            
        # Verificar palavras-chave suspeitas
        url_lower = url.lower()
        for pattern in MALICIOUS_URL_PATTERNS:
            if pattern in url_lower:
                warnings.append(f"Palavra-chave suspeita: {pattern}")
                score += 20
                
        return warnings, score
    
    def detect_phishing(self, url):
        """Detenta padrões de phishing"""
        phishing_indicators = []
        score = 0
        
        parsed = self.parse_url(url)
        if 'error' in parsed:
            return phishing_indicators, 0
            
        domain = parsed.get('hostname', '')
        domain_lower = domain.lower()
        
        # Verificar palavras-chave de phishing
        for keyword in PHISHING_KEYWORDS:
            if keyword in domain_lower:
                phishing_indicators.append(f"Domínio contém '{keyword}' - possível phishing")
                score += 15
                
        # Verificar números excessivos no domínio (comum em phishing)
        numbers = re.findall(r'\\d+', domain)
        if len(''.join(numbers)) > 6:  # Mais de 6 dígitos juntos
            phishing_indicators.append("Domínio contém muitos números")
            score += 20
            
        # Verificar homoglyphs (caracteres semelhantes)
        suspicious_chars = ['0', '1', 'l', 'i', 'o', '0']
        # Esta é uma verificação simplificada
        
        # Verificar typosquatting - domínios populares com pequenas variações
        popular_domains = ['google', 'facebook', 'amazon', 'microsoft', 'apple', 'paypal', 'netflix', 'instagram', 'twitter', 'bank']
        for popular in popular_domains:
            if popular in domain_lower and domain_lower != popular and not domain_lower.endswith('.' + popular + '.com'):
                # Possível typosquatting
                phishing_indicators.append(f"Possível typosquatting de {popular}")
                score += 30
                
        return phishing_indicators, score
    
    def check_url_safety(self, url):
        """Verifica a segurança de uma URL"""
        warnings = []
        threat_indicators = []
        total_score = 0
        
        # Análise de estrutura
        structure_warnings, structure_score = self.analyze_url_structure(url)
        warnings.extend(structure_warnings)
        total_score += structure_score
        
        # Detecção de phishing
        phishing_indicators, phishing_score = self.detect_phishing(url)
        threat_indicators.extend(phishing_indicators)
        total_score += phishing_score
        
        # Verificar reputação do domínio
        domain = self.extract_domain(url)
        if domain:
            reputation, rep_score, rep_details = self.check_domain_reputation(domain)
            total_score += rep_score
            
        return {
            'warnings': warnings,
            'threat_indicators': threat_indicators,
            'total_score': total_score
        }
    
    def scan_url(self, url):
        """Escaneia uma URL completa"""
        result = {
            'url': url,
            'status': 'unknown',
            'reputation': 'unknown',
            'details': {}
        }
        
        # Parse URL
        parsed = self.parse_url(url)
        if 'error' in parsed:
            result['status'] = 'error'
            result['details']['error'] = parsed['error']
            return result
            
        # Verificar se tem protocolo
        if not parsed.get('scheme'):
            result['details']['warning'] = 'URL sem protocolo'
            
        # Obter domínio
        domain = parsed.get('hostname')
        if not domain:
            result['status'] = 'invalid'
            result['details']['error'] = 'Domínio não encontrado'
            return result
            
        # Verificar reputação do domínio
        reputation, rep_score, rep_details = self.check_domain_reputation(domain)
        result['details']['domain'] = domain
        result['details'].update(rep_details)
        
        # Análise de segurança
        safety = self.check_url_safety(url)
        result['details']['warnings'] = safety['warnings']
        result['details']['threat_indicators'] = safety['threat_indicators']
        
        # Calcular score final
        final_score = rep_score + safety['total_score']
        
        # Determinar status
        if final_score >= 70:
            result['status'] = 'dangerous'
            result['reputation'] = 'malicious'
        elif final_score >= 40:
            result['status'] = 'suspicious'
            result['reputation'] = 'suspicious'
        elif final_score >= 20:
            result['status'] = 'caution'
            result['reputation'] = 'neutral'
        else:
            result['status'] = 'safe'
            result['reputation'] = 'safe'
            
        result['details']['safety_score'] = final_score
        
        self.checked_urls.append(result)
        return result
    
    def scan_multiple_urls(self, urls):
        """Escaneia múltiplas URLs"""
        results = []
        for url in urls:
            result = self.scan_url(url)
            results.append(result)
        return results
    
    def get_scan_statistics(self):
        """Retorna estatísticas dos scans"""
        if not self.checked_urls:
            return {'total': 0}
            
        stats = {
            'total': len(self.checked_urls),
            'safe': 0,
            'suspicious': 0,
            'dangerous': 0,
            'errors': 0
        }
        
        for result in self.checked_urls:
            if result['status'] == 'safe':
                stats['safe'] += 1
            elif result['status'] in ['suspicious', 'caution']:
                stats['suspicious'] += 1
            elif result['status'] == 'dangerous':
                stats['dangerous'] += 1
            else:
                stats['errors'] += 1
                
        return stats
