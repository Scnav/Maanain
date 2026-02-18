#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Maanain Security Scanner
Scanner completo de segurança: arquivos, URLs e rede
"""

import argparse
import sys
import io

# Configurar UTF-8 para Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from scanner import FileScanner, URLScanner, NetworkScanner
from datetime import datetime

def print_banner():
    """Exibe o banner do scanner"""
    banner = """
    ╔═══════════════════════════════════════════════════════════╗
    ║          MAANAIN SECURITY SCANNER v1.0                    ║
    ║           Scanner de Segurança Completo                   ║
    ╠═══════════════════════════════════════════════════════════╣
    ║  [1] Scanner de Arquivos Locais                          ║
    ║  [2] Scanner de URLs/Domínios                            ║
    ║  [3] Scanner de Rede                                     ║
    ║  [4] Scanner Completo (Todos)                            ║
    ║  [5] Sair                                                ║
    ╚═══════════════════════════════════════════════════════════╝
    """
    print(banner)

def scan_files(scanner):
    """Executa scanner de arquivos locais"""
    print("\n" + "="*60)
    print("🔍 SCANNER DE ARQUIVOS LOCAIS")
    print("="*60)
    
    path = input("\n📁 Digite o caminho da pasta para escanear: ").strip()
    if not path:
        path = "."
    
    print(f"\n⏳ Escaneando: {path}...")
    results = scanner.scan_directory(path)
    
    print(f"\n📊 RESULTADOS:")
    print(f"   Arquivos escaneados: {results['total_files']}")
    print(f"   Ameaças encontradas: {results['threats_found']}")
    print(f"   Arquivos limpos: {results['clean_files']}")
    
    if results['threats']:
        print(f"\n⚠️  AMEAÇAS DETECTADAS:")
        for threat in results['threats']:
            print(f"   - {threat}")

def scan_urls(scanner):
    """Executa scanner de URLs"""
    print("\n" + "="*60)
    print("🌐 SCANNER DE URLs/DOMÍNIOS")
    print("="*60)
    
    url = input("\n🌍 Digite a URL ou domínio para verificar: ").strip()
    if not url:
        print("❌ URL não fornecida!")
        return
    
    # Adicionar http se não tiver protocolo
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    print(f"\n⏳ Verificando: {url}...")
    result = scanner.scan_url(url)
    
    print(f"\n📊 RESULTADO:")
    print(f"   URL: {result['url']}")
    print(f"   Status: {result['status']}")
    print(f"   Reputação: {result['reputation']}")
    
    if result['details']:
        print(f"\n📋 Detalhes:")
        for key, value in result['details'].items():
            print(f"   {key}: {value}")

def scan_network(scanner):
    """Executa scanner de rede"""
    print("\n" + "="*60)
    print("🌍 SCANNER DE REDE")
    print("="*60)
    
    target = input("\n🎯 Digite o IP ou hostname para escanear: ").strip()
    if not target:
        target = "localhost"
    
    print(f"\n⏳ Escaneando: {target}...")
    results = scanner.scan(target)
    
    print(f"\n📊 RESULTADOS DO SCAN DE REDE:")
    print(f"   Host: {results['host']}")
    print(f"   Status: {results['status']}")
    print(f"   Portas abertas: {results['open_ports']}")
    
    if results['services']:
        print(f"\n🔗 SERVIÇOS DETECTADOS:")
        for service in results['services']:
            print(f"   - Porta {service['port']}: {service['name']} ({service['state']})")

def scan_all(file_scanner, url_scanner, network_scanner):
    """Executa todos os scanners"""
    print("\n" + "="*60)
    print("🚀 MODO SCANNER COMPLETO")
    print("="*60)
    
    # Scanner de arquivos
    print("\n[1/3] Scanner de Arquivos...")
    path = input("📁 Pasta para escanear (Enter para atual): ").strip() or "."
    results = file_scanner.scan_directory(path)
    print(f"   ✅ Arquivos: {results['total_files']} | Ameaças: {results['threats_found']}")
    
    # Scanner de URL
    print("\n[2/3] Scanner de URL...")
    url = input("🌍 URL para verificar (Enter para pular): ").strip()
    if url:
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        result = url_scanner.scan_url(url)
        print(f"   ✅ Status: {result['status']} | Reputação: {result['reputation']}")
    
    # Scanner de rede
    print("\n[3/3] Scanner de Rede...")
    target = input("🎯 IP/Host para escanear (Enter para localhost): ").strip() or "localhost"
    results = network_scanner.scan(target)
    print(f"   ✅ Host: {results['host']} | Portas abertas: {len(results['open_ports'])}")
    
    print("\n" + "="*60)
    print("✅ SCANNER COMPLETO FINALIZADO")
    print("="*60)

def main():
    """Função principal"""
    print_banner()
    
    # Inicializa os scanners
    file_scanner = FileScanner()
    url_scanner = URLScanner()
    network_scanner = NetworkScanner()
    
    while True:
        try:
            choice = input("\n👉 Selecione uma opção (1-5): ").strip()
            
            if choice == '1':
                scan_files(file_scanner)
            elif choice == '2':
                scan_urls(url_scanner)
            elif choice == '3':
                scan_network(network_scanner)
            elif choice == '4':
                scan_all(file_scanner, url_scanner, network_scanner)
            elif choice == '5':
                print("\n👋 Saindo... Obrigado por usar o Maanain Scanner!")
                sys.exit(0)
            else:
                print("❌ Opção inválida! Tente novamente.")
                
        except KeyboardInterrupt:
            print("\n\n⚠️  Operação cancelada pelo usuário")
            sys.exit(0)
        except Exception as e:
            print(f"\n❌ Erro: {e}")

if __name__ == "__main__":
    main()
