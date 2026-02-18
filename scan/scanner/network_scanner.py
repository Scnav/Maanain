"""
Scanner de Rede
Escaneia hosts e portas para identificar serviços e vulnerabilidades
"""

import socket
import subprocess
import re
from datetime import datetime

# Portas comuns e seus serviços
COMMON_PORTS = {
    20: {'name': 'FTP-DATA', 'risk': 'medium'},
    21: {'name': 'FTP', 'risk': 'high'},
    22: {'name': 'SSH', 'risk': 'medium'},
    23: {'name': 'Telnet', 'risk': 'high'},
    25: {'name': 'SMTP', 'risk': 'medium'},
    53: {'name': 'DNS', 'risk': 'low'},
    80: {'name': 'HTTP', 'risk': 'medium'},
    110: {'name': 'POP3', 'risk': 'medium'},
    111: {'name': 'RPC', 'risk': 'high'},
    135: {'name': 'MSRPC', 'risk': 'medium'},
    139: {'name': 'NetBIOS', 'risk': 'medium'},
    143: {'name': 'IMAP', 'risk': 'medium'},
    443: {'name': 'HTTPS', 'risk': 'low'},
    445: {'name': 'SMB', 'risk': 'high'},
    993: {'name': 'IMAPS', 'risk': 'low'},
    995: {'name': 'POP3S', 'risk': 'low'},
    1433: {'name': 'MSSQL', 'risk': 'high'},
    1521: {'name': 'Oracle', 'risk': 'high'},
    3306: {'name': 'MySQL', 'risk': 'high'},
    3389: {'name': 'RDP', 'risk': 'high'},
    5432: {'name': 'PostgreSQL', 'risk': 'high'},
    5900: {'name': 'VNC', 'risk': 'high'},
    5901: {'name': 'VNC-1', 'risk': 'high'},
    6379: {'name': 'Redis', 'risk': 'high'},
    8080: {'name': 'HTTP-Proxy', 'risk': 'medium'},
    8443: {'name': 'HTTPS-Alt', 'risk': 'low'},
    27017: {'name': 'MongoDB', 'risk': 'high'},
}

# Portas de alto risco (comumente exploradas)
HIGH_RISK_PORTS = [21, 23, 135, 139, 445, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 27017]

class NetworkScanner:
    """Scanner de rede para detecção de serviços e vulnerabilidades"""
    
    def __init__(self):
        self.scan_results = []
        self.timeout = 2  # Timeout para conexões
        
    def resolve_hostname(self, target):
        """Resolve hostname para IP"""
        try:
            ip = socket.gethostbyname(target)
            return ip
        except socket.gaierror:
            return None
    
    def check_port(self, target, port, timeout=2):
        """Verifica se uma porta está aberta"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((target, port))
            sock.close()
            return result == 0
        except Exception:
            return False
    
    def get_service_info(self, port):
        """Obtém informações sobre o serviço"""
        return COMMON_PORTS.get(port, {'name': 'Unknown', 'risk': 'unknown'})
    
    def scan_port(self, target, port):
        """Escaneia uma porta específica"""
        is_open = self.check_port(target, port, self.timeout)
        
        result = {
            'port': port,
            'state': 'open' if is_open else 'closed',
            'service': 'Unknown',
            'risk': 'unknown'
        }
        
        if is_open:
            service_info = self.get_service_info(port)
            result['service'] = service_info['name']
            result['risk'] = service_info['risk']
            
        return result
    
    def scan_common_ports(self, target):
        """Escaneia as portas mais comuns"""
        results = []
        
        for port in COMMON_PORTS.keys():
            port_result = self.scan_port(target, port)
            if port_result['state'] == 'open':
                results.append(port_result)
                
        return results
    
    def scan_port_range(self, target, start_port, end_port):
        """Escaneia um range de portas"""
        results = []
        
        for port in range(start_port, end_port + 1):
            port_result = self.scan_port(target, port)
            if port_result['state'] == 'open':
                results.append(port_result)
                
        return results
    
    def get_banner(self, target, port):
        """Tenta obter o banner do serviço"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            sock.connect((target, port))
            
            # Enviar request básico dependendo da porta
            if port == 80:
                sock.send(b'GET / HTTP/1.0\\r\\n\\r\\n')
            elif port == 22:
                pass  # SSH já envia banner automaticamente
            
            banner = sock.recv(1024).decode('utf-8', errors='ignore').strip()
            sock.close()
            return banner if banner else None
        except Exception:
            return None
    
    def scan(self, target):
        """Escaneia um host completo"""
        start_time = datetime.now()
        
        result = {
            'target': target,
            'ip': None,
            'status': 'unknown',
            'open_ports': [],
            'services': [],
            'high_risk_findings': [],
            'scan_time': None,
            'errors': []
        }
        
        # Resolver hostname
        ip = self.resolve_hostname(target)
        if not ip:
            result['errors'].append(f"Não foi possível resolver: {target}")
            result['status'] = 'unreachable'
            return result
            
        result['ip'] = ip
        
        # Verificar se o host está ativo
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            sock.connect((ip, 80))  # Tentar porta 80
            sock.close()
            result['status'] = 'online'
        except Exception:
            # Tentar ping
            try:
                response = subprocess.run(['ping', '-n', '1', '-w', '1000', target],
                                         capture_output=True, text=True, timeout=3)
                if response.returncode == 0:
                    result['status'] = 'online'
                else:
                    result['status'] = 'offline'
            except Exception as e:
                result['errors'].append(f"Erro ao verificar status: {str(e)}")
                result['status'] = 'unknown'
        
        # Scan de portas comuns
        open_ports = self.scan_common_ports(target)
        
        for port_info in open_ports:
            port = port_info['port']
            service_info = {
                'port': port,
                'name': port_info['service'],
                'state': 'open',
                'risk': port_info['risk'],
                'banner': None
            }
            
            # Tentar obter banner
            if port not in HIGH_RISK_PORTS:  # Não gastar tempo em portas de alto risco
                banner = self.get_banner(target, port)
                if banner:
                    service_info['banner'] = banner[:100]  # Limitar tamanho
            
            result['services'].append(service_info)
            result['open_ports'].append(port)
            
            # Verificar alto risco
            if port in HIGH_RISK_PORTS:
                result['high_risk_findings'].append({
                    'port': port,
                    'service': port_info['service'],
                    'risk': 'high',
                    'warning': f"Porta {port} ({port_info['service']}) está aberta - possível vulnerabilidade"
                })
        
        # Tempo de scan
        end_time = datetime.now()
        result['scan_time'] = str(end_time - start_time)
        
        self.scan_results.append(result)
        return result
    
    def scan_multiple_targets(self, targets):
        """Escaneia múltiplos alvos"""
        results = []
        for target in targets:
            result = self.scan(target)
            results.append(result)
        return results
    
    def get_network_info(self):
        """Obtém informações da rede local"""
        info = {
            'hostname': socket.gethostname(),
            'local_ip': None,
            'fqdn': socket.getfqdn()
        }
        
        # Obter IP local
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            info['local_ip'] = s.getsockname()[0]
            s.close()
        except Exception:
            pass
            
        return info
    
    def get_scan_summary(self):
        """Retorna resumo dos scans"""
        if not self.scan_results:
            return {'total_scans': 0}
            
        summary = {
            'total_scans': len(self.scan_results),
            'hosts_online': 0,
            'hosts_offline': 0,
            'total_open_ports': 0,
            'high_risk_findings': 0
        }
        
        for result in self.scan_results:
            if result['status'] == 'online':
                summary['hosts_online'] += 1
            else:
                summary['hosts_offline'] += 1
                
            summary['total_open_ports'] += len(result['open_ports'])
            summary['high_risk_findings'] += len(result['high_risk_findings'])
            
        return summary
