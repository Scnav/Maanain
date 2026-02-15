const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Caminho para a pasta com os arquivos JSON da Bíblia NVI
const BIBLIA_NVI_PATH = path.join(__dirname, '..', 'public', 'BibliaJSON-master', 'biblia_nvi');
const DB_PATH = path.join(__dirname, 'biblia.db');

// Mapeamento de nomes de livros para IDs numéricos
const LIVROS = {
  'genesis': 1,
  'exodo': 2,
  'levitico': 3,
  'numeros': 4,
  'deuteronomio': 5,
  'josue': 6,
  'juizes': 7,
  'rute': 8,
  '1 samuel': 9,
  '2 samuel': 10,
  '1 reis': 11,
  '2 reis': 12,
  '1 cronicas': 13,
  '2 cronicas': 14,
  'esdras': 15,
  'neemias': 16,
  'ester': 17,
  'jo': 18,
  'salmos': 19,
  'proverbios': 20,
  'eclesiastes': 21,
  'canticos': 22,
  'isaias': 23,
  'jeremias': 24,
  'lamentacoes de jeremias': 25,
  'ezequiel': 26,
  'daniel': 27,
  'oseias': 28,
  'joel': 29,
  'amos': 30,
  'obadias': 31,
  'jonas': 32,
  'miqueias': 33,
  'naum': 34,
  'habacuque': 35,
  'sofonias': 36,
  'ageu': 37,
  'zacarias': 38,
  'malaquias': 39,
  'mateus': 40,
  'marcos': 41,
  'lucas': 42,
  'joao': 43,
  'atos': 44,
  'romanos': 45,
  '1 corintios': 46,
  '2 corintios': 47,
  'galatas': 48,
  'efesios': 49,
  'filipenses': 50,
  'colossenses': 51,
  '1 tessalonicenses': 52,
  '2 tessalonicenses': 53,
  '1 timoteo': 54,
  '2 timoteo': 55,
  'tito': 56,
  'filemom': 57,
  'hebreus': 58,
  'tiago': 59,
  '1 pedro': 60,
  '2 pedro': 61,
  '1 joao': 62,
  '2 joao': 63,
  '3 joao': 64,
  'judas': 65,
  'apocalipse': 66
};

// Nomes completos dos livros para exibição
const NOMES_LIVROS = {
  1: 'Gênesis', 2: 'Êxodo', 3: 'Levítico', 4: 'Números', 5: 'Deuteronômio',
  6: 'Josué', 7: 'Juízes', 8: 'Rute', 9: '1 Samuel', 10: '2 Samuel',
  11: '1 Reis', 12: '2 Reis', 13: '1 Crônicas', 14: '2 Crônicas', 15: 'Esdras',
  16: 'Neemias', 17: 'Ester', 18: 'Jó', 19: 'Salmos', 20: 'Provérbios',
  21: 'Eclesiastes', 22: 'Cânticos', 23: 'Isaías', 24: 'Jeremias', 25: 'Lamentações',
  26: 'Ezequiel', 27: 'Daniel', 28: 'Oséias', 29: 'Joel', 30: 'Amós',
  31: 'Obadias', 32: ' Jonas', 33: 'Miquéias', 34: 'Naum', 35: 'Habacuque',
  36: 'Sofonias', 37: 'Ageu', 38: 'Zacarias', 39: 'Malaquias', 40: 'Mateus',
  41: 'Marcos', 42: 'Lucas', 43: 'João', 44: 'Atos', 45: 'Romanos',
  46: '1 Coríntios', 47: '2 Coríntios', 48: 'Gálatas', 49: 'Efésios', 50: 'Filipenses',
  51: 'Colossenses', 52: '1 Tessalonicenses', 53: '2 Tessalonicenses', 54: '1 Timóteo', 55: '2 Timóteo',
  56: 'Tito', 57: 'Filemom', 58: 'Hebreus', 59: 'Tiago', 60: '1 Pedro',
  61: '2 Pedro', 62: '1 João', 63: '2 João', 64: '3 João', 65: 'Judas',
  66: 'Apocalipse'
};

function getLivroId(nomeArquivo) {
  const nome = nomeArquivo.replace('.json', '').toLowerCase().trim();
  return LIVROS[nome] || null;
}

async function importarBiblia() {
  console.log('Iniciando importação da Bíblia NVI...');
  
  // Remove banco existente se houver
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Banco de dados anterior removido.');
  }
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Criar tabelas primeiro
  await new Promise((resolve) => {
    db.serialize(() => {
      // Tabela de livros
      db.run(`
        CREATE TABLE IF NOT EXISTS livros (
          id INTEGER PRIMARY KEY,
          nome TEXT NOT NULL,
          abreviacao TEXT
        )
      `);
      
      // Tabela de capítulos
      db.run(`
        CREATE TABLE IF NOT EXISTS capitulos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          livro_id INTEGER NOT NULL,
          numero INTEGER NOT NULL,
          FOREIGN KEY (livro_id) REFERENCES livros(id)
        )
      `);
      
      // Tabela de versos
      db.run(`
        CREATE TABLE IF NOT EXISTS versos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          capitulo_id INTEGER NOT NULL,
          livro_id INTEGER NOT NULL,
          capitulo_numero INTEGER NOT NULL,
          versiculo INTEGER NOT NULL,
          texto TEXT NOT NULL,
          FOREIGN KEY (capitulo_id) REFERENCES capitulos(id),
          FOREIGN KEY (livro_id) REFERENCES livros(id)
        )
      `);
      
      // Tabela FTS5 para busca full-text
      db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS versos_fts USING fts5(
          texto,
          content='versos',
          content_rowid='id'
        )
      `);
      
      // Criar índices
      db.run('CREATE INDEX IF NOT EXISTS idx_versos_capitulo ON versos(capitulo_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_versos_livro ON versos(livro_id, capitulo_numero)');
      
      // Inserir livros
      const insertLivro = db.prepare('INSERT INTO livros (id, nome) VALUES (?, ?)');
      for (const [id, nome] of Object.entries(NOMES_LIVROS)) {
        insertLivro.run(parseInt(id), nome);
      }
      insertLivro.finalize();
      console.log('66 livros inseridos.');
      
      resolve();
    });
  });
  
  // Ler todos os arquivos JSON
  const arquivos = fs.readdirSync(BIBLIA_NVI_PATH);
  console.log(`Encontrados ${arquivos.length} arquivos JSON.`);
  
  // Processar cada arquivo
  for (const filename of arquivos) {
    if (!filename.endsWith('.json')) continue;
    
    const livroId = getLivroId(filename);
    if (!livroId) {
      console.log(`  - Livro não encontrado no mapeamento: ${filename}`);
      continue;
    }
    
    try {
      const filePath = path.join(BIBLIA_NVI_PATH, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      const capitulos = JSON.parse(content);
      
      // Processar cada capítulo
      for (let idx = 0; idx < capitulos.length; idx++) {
        const numeroCapitulo = idx + 1;
        const capituloObj = capitulos[idx];
        
        // Inserir capítulo e obter ID
        const capituloId = await new Promise((resolve) => {
          db.run('INSERT INTO capitulos (livro_id, numero) VALUES (?, ?)', 
            [livroId, numeroCapitulo], 
            function(err) {
              if (err) {
                console.error(`Erro ao inserir capítulo: ${err.message}`);
                resolve(null);
              } else {
                resolve(this.lastID);
              }
            }
          );
        });
        
        if (!capituloId) continue;
        
        // Obter versos do capítulo
        const capituloData = capituloObj[numeroCapitulo] || {};
        const versos = Object.entries(capituloData);
        
        // Inserir versos em batch
        for (const [numVerso, texto] of versos) {
          await new Promise((resolve) => {
            db.run(
              'INSERT INTO versos (capitulo_id, livro_id, capitulo_numero, versiculo, texto) VALUES (?, ?, ?, ?, ?)',
              [capituloId, livroId, numeroCapitulo, parseInt(numVerso), texto],
              resolve
            );
          });
        }
      }
      
      console.log(`  - ${filename}: ${capitulos.length} capítulos`);
    } catch (err) {
      console.error(`Erro ao processar ${filename}: ${err.message}`);
    }
  }
  
  console.log('Criando índice FTS5...');
  
  // Criar índice FTS5
  await new Promise((resolve) => {
    db.run("INSERT INTO versos_fts(versos_fts) VALUES('rebuild')", (err) => {
      if (err) {
        console.error('Erro ao criar índice FTS5:', err.message);
      } else {
        console.log('Índice FTS5 criado com sucesso!');
      }
      resolve();
    });
  });
  
  // Estatísticas finais
  const totalVersos = await new Promise((resolve) => {
    db.get('SELECT COUNT(*) as total FROM versos', (err, row) => {
      resolve(row.total);
    });
  });
  
  const totalCapitulos = await new Promise((resolve) => {
    db.get('SELECT COUNT(*) as total FROM capitulos', (err, row) => {
      resolve(row.total);
    });
  });
  
  console.log(`\nTotal de versos importados: ${totalVersos}`);
  console.log(`Total de capítulos importados: ${totalCapitulos}`);
  console.log('\nImportação concluída com sucesso!');
  
  db.close();
}

importarBiblia().catch(err => {
  console.error('Erro durante importação:', err);
  process.exit(1);
});
