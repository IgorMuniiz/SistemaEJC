const criarErroPublico = (status, message) => {
  const err = new Error(message);
  err.status = status;
  err.public = true;
  return err;
};

const isSafeSqlIdentifierLocal = (value) => /^[a-zA-Z0-9_]+$/.test(String(value || '').trim());

const carregarDadosEncontroCompletoDeOrigemExterna = async ({
  dbEngine,
  connectionString,
  databaseName,
  colecaoEquipes,
  colecaoCirculos,
  colecaoEncontreiros,
  limite,
  importarEquipes,
  importarCirculos,
  importarEncontreiros,
  deps,
}) => {
  const {
    mongoose,
  } = deps;

  const engine = String(dbEngine || '').toLowerCase();
  const conn = String(connectionString || '').trim();

  if (!conn) {
    throw criarErroPublico(400, 'A conexao com o banco externo e obrigatoria.');
  }

  const equipeRows = [];
  const circuloRows = [];
  const encontreirosRows = [];

  if (engine === 'mongodb') {
    if (!/^mongodb(\+srv)?:\/\//i.test(conn)) {
      throw criarErroPublico(400, 'Para MongoDB use uma URI valida (mongodb:// ou mongodb+srv://).');
    }

    const extConn = await mongoose.createConnection(conn, {
      dbName: databaseName || undefined,
      serverSelectionTimeoutMS: 12000,
      maxPoolSize: 5,
    }).asPromise();

    try {
      const extDb = extConn.db;

      if (importarEquipes) {
        const equipes = await extDb.collection(colecaoEquipes).find({}).limit(limite).toArray();
        equipeRows.push(...equipes);
      }

      if (importarCirculos) {
        const circulos = await extDb.collection(colecaoCirculos).find({}).limit(limite).toArray();
        circuloRows.push(...circulos);
      }

      if (importarEncontreiros) {
        const encontreiros = await extDb.collection(colecaoEncontreiros).find({}).limit(limite).toArray();
        encontreirosRows.push(...encontreiros);
      }
    } finally {
      await extConn.close();
    }

    return {
      equipeRows,
      circuloRows,
      encontreirosRows,
    };
  }

  if (engine === 'postgresql' || engine === 'postgres') {
    let PgClient;
    try {
      ({ Client: PgClient } = require('pg'));
    } catch (err) {
      throw criarErroPublico(500, 'Dependencia "pg" nao instalada. Rode: npm install pg');
    }

    if (!/^postgres(ql)?:\/\//i.test(conn)) {
      throw criarErroPublico(400, 'Para PostgreSQL use uma string de conexao valida (postgresql://).');
    }

    const tabelas = [colecaoEquipes, colecaoCirculos, colecaoEncontreiros].filter(Boolean);
    if (tabelas.some((item) => !isSafeSqlIdentifierLocal(item))) {
      throw criarErroPublico(400, 'Use apenas letras, numeros e underscore nos nomes das tabelas externas.');
    }

    const pgClient = new PgClient({ connectionString: conn });
    await pgClient.connect();
    try {
      if (importarEquipes) {
        const equipes = await pgClient.query(`SELECT * FROM ${colecaoEquipes} LIMIT $1`, [limite]);
        equipeRows.push(...equipes.rows);
      }

      if (importarCirculos) {
        const circulos = await pgClient.query(`SELECT * FROM ${colecaoCirculos} LIMIT $1`, [limite]);
        circuloRows.push(...circulos.rows);
      }

      if (importarEncontreiros) {
        const encontreiros = await pgClient.query(`SELECT * FROM ${colecaoEncontreiros} LIMIT $1`, [limite]);
        encontreirosRows.push(...encontreiros.rows);
      }
    } finally {
      await pgClient.end();
    }

    return {
      equipeRows,
      circuloRows,
      encontreirosRows,
    };
  }

  if (engine === 'mysql') {
    let mysql;
    try {
      mysql = require('mysql2/promise');
    } catch (err) {
      throw criarErroPublico(500, 'Dependencia "mysql2" nao instalada. Rode: npm install mysql2');
    }

    if (!/^mysql:\/\//i.test(conn)) {
      throw criarErroPublico(400, 'Para MySQL use uma string de conexao valida (mysql://).');
    }

    const tabelas = [colecaoEquipes, colecaoCirculos, colecaoEncontreiros].filter(Boolean);
    if (tabelas.some((item) => !isSafeSqlIdentifierLocal(item))) {
      throw criarErroPublico(400, 'Use apenas letras, numeros e underscore nos nomes das tabelas externas.');
    }

    const mysqlConn = await mysql.createConnection(conn);
    try {
      if (importarEquipes) {
        const [equipes] = await mysqlConn.query(`SELECT * FROM \`${colecaoEquipes}\` LIMIT ?`, [limite]);
        equipeRows.push(...equipes);
      }

      if (importarCirculos) {
        const [circulos] = await mysqlConn.query(`SELECT * FROM \`${colecaoCirculos}\` LIMIT ?`, [limite]);
        circuloRows.push(...circulos);
      }

      if (importarEncontreiros) {
        const [encontreiros] = await mysqlConn.query(`SELECT * FROM \`${colecaoEncontreiros}\` LIMIT ?`, [limite]);
        encontreirosRows.push(...encontreiros);
      }
    } finally {
      await mysqlConn.end();
    }

    return {
      equipeRows,
      circuloRows,
      encontreirosRows,
    };
  }

  throw criarErroPublico(400, 'Banco nao suportado. Use MongoDB, PostgreSQL ou MySQL.');
};

const carregarEncontreirosDeOrigemExterna = async ({
  dbEngine,
  connectionString,
  databaseName,
  colecaoEncontreiros,
  limite,
  deps,
}) => {
  const {
    mongoose,
  } = deps;

  const engine = String(dbEngine || '').toLowerCase();
  const conn = String(connectionString || '').trim();

  if (!conn) {
    throw criarErroPublico(400, 'A conexao com o banco externo e obrigatoria.');
  }

  if (engine === 'mongodb') {
    if (!/^mongodb(\+srv)?:\/\//i.test(conn)) {
      throw criarErroPublico(400, 'Para MongoDB use uma URI valida (mongodb:// ou mongodb+srv://).');
    }

    const externalConnection = await mongoose.createConnection(conn, {
      dbName: databaseName || undefined,
      serverSelectionTimeoutMS: 12000,
      maxPoolSize: 5,
    }).asPromise();

    try {
      const externalDb = externalConnection.db;
      return await externalDb.collection(colecaoEncontreiros).find({}).limit(limite).toArray();
    } finally {
      await externalConnection.close();
    }
  }

  if (engine === 'postgresql' || engine === 'postgres') {
    let PgClient;
    try {
      ({ Client: PgClient } = require('pg'));
    } catch (err) {
      throw criarErroPublico(500, 'Dependencia "pg" nao instalada. Rode: npm install pg');
    }

    if (!/^postgres(ql)?:\/\//i.test(conn)) {
      throw criarErroPublico(400, 'Para PostgreSQL use uma string de conexao valida (postgresql://).');
    }

    if (!isSafeSqlIdentifierLocal(colecaoEncontreiros)) {
      throw criarErroPublico(400, 'Nome da tabela invalido.');
    }

    const sqlConnection = new PgClient({ connectionString: conn });
    await sqlConnection.connect();
    try {
      const queryResult = await sqlConnection.query(`SELECT * FROM ${colecaoEncontreiros} LIMIT $1`, [limite]);
      return queryResult.rows;
    } finally {
      await sqlConnection.end();
    }
  }

  if (engine === 'mysql') {
    let mysql;
    try {
      mysql = require('mysql2/promise');
    } catch (err) {
      throw criarErroPublico(500, 'Dependencia "mysql2" nao instalada. Rode: npm install mysql2');
    }

    if (!/^mysql:\/\//i.test(conn)) {
      throw criarErroPublico(400, 'Para MySQL use uma string de conexao valida (mysql://).');
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(String(colecaoEncontreiros || '').trim())) {
      throw criarErroPublico(400, 'Nome da tabela invalido.');
    }

    const sqlConnection = await mysql.createConnection(conn);
    try {
      const [rows] = await sqlConnection.query(`SELECT * FROM ${colecaoEncontreiros} LIMIT ?`, [limite]);
      return rows;
    } finally {
      await sqlConnection.end();
    }
  }

  throw criarErroPublico(400, 'Banco nao suportado. Use MongoDB, PostgreSQL ou MySQL.');
};

module.exports = {
  carregarDadosEncontroCompletoDeOrigemExterna,
  carregarEncontreirosDeOrigemExterna,
};
