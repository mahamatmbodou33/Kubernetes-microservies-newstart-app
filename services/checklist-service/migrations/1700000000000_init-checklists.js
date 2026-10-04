/* eslint-disable */
// Checklist Service initial schema. Applies the canonical schema.sql so the
// migrated schema and the schema used by integration tests never diverge.
const fs = require('node:fs');
const path = require('node:path');

const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');

exports.up = (pgm) => {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS tasks CASCADE;');
  pgm.sql('DROP TABLE IF EXISTS checklists CASCADE;');
};
