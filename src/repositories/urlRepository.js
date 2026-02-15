class UrlRepository {
  constructor(db) {
    this.db = db;
  }

  async create({ originalUrl, shortCode, expiresAt }) {
    const query = `
      INSERT INTO urls (original_url, short_code, expires_at)
      VALUES (?, ?, ?)
    `;

    const [result] = await this.db.execute(query, [originalUrl, shortCode, expiresAt]);
    return result.insertId;
  }

  async findByShortCode(shortCode) {
    const query = `
      SELECT id, original_url, short_code, created_at, click_count, expires_at
      FROM urls
      WHERE short_code = ?
      LIMIT 1
    `;

    const [rows] = await this.db.execute(query, [shortCode]);
    return rows[0] || null;
  }

  async incrementClickCount(id) {
    const query = `
      UPDATE urls
      SET click_count = click_count + 1
      WHERE id = ?
    `;

    await this.db.execute(query, [id]);
  }
}

module.exports = UrlRepository;
