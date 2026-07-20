import { Router } from "express";
import { pool } from "./db.js";
import { encode } from "./base62.js";
import { redisClient, cacheKey, CACHE_TTL_SECONDS } from "./redis.js";

const router = Router();

const URL_REGEX = /^https?:\/\/.+/i;
const CUSTOM_ALIAS_REGEX = /^[A-Za-z0-9_-]{3,20}$/;

router.post("/api/shorten", async (req, res) => {
  const { url, customAlias } = req.body || {};

  if (!url || typeof url !== "string" || !URL_REGEX.test(url)) {
    return res.status(400).json({ error: "Provide a valid http(s) URL." });
  }

  if (customAlias && !CUSTOM_ALIAS_REGEX.test(customAlias)) {
    return res.status(400).json({
      error: "Custom alias must be 3-20 chars: letters, numbers, _ or -.",
    });
  }

  const client = await pool.connect();
  try {
    if (customAlias) {
      const insert = await client.query(
        `INSERT INTO urls (short_code, long_url, custom_alias) VALUES ($1, $2, TRUE) RETURNING id`,
                                        [customAlias, url]
      );
      const shortCode = insert.rows[0].short_code || customAlias;
      await redisClient.set(cacheKey(customAlias), url, { EX: CACHE_TTL_SECONDS });
      return res.status(201).json({
        shortCode: customAlias,
        shortUrl: `${process.env.BASE_URL}/${customAlias}`,
        longUrl: url,
      });
    }

    const insert = await client.query(
      `INSERT INTO urls (short_code, long_url) VALUES ('', $1) RETURNING id`,
                                      [url]
    );
    const id = insert.rows[0].id;
    const shortCode = encode(id);

    await client.query(`UPDATE urls SET short_code = $1 WHERE id = $2`, [
      shortCode,
      id,
    ]);

    await redisClient.set(cacheKey(shortCode), url, { EX: CACHE_TTL_SECONDS });

    res.status(201).json({
      shortCode,
      shortUrl: `${process.env.BASE_URL}/${shortCode}`,
      longUrl: url,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "That alias is already taken." });
    }
    console.error(err);
    res.status(500).json({ error: "Internal error creating short URL." });
  } finally {
    client.release();
  }
});

router.get("/:code", async (req, res) => {
  const { code } = req.params;

  try {
    const cached = await redisClient.get(cacheKey(code));
    if (cached) {
      recordClick(code, req).catch((e) => console.error("click log failed", e));
      return res.redirect(302, cached);
    }

    const result = await pool.query(
      `SELECT long_url FROM urls WHERE short_code = $1`,
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Short URL not found." });
    }

    const { long_url } = result.rows[0];
    await redisClient.set(cacheKey(code), long_url, { EX: CACHE_TTL_SECONDS });

    recordClick(code, req).catch((e) => console.error("click log failed", e));
    res.redirect(302, long_url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error resolving short URL." });
  }
});

async function recordClick(code, req) {
  const urlRes = await pool.query(`SELECT id FROM urls WHERE short_code = $1`, [code]);
  if (urlRes.rows.length === 0) return;
  const urlId = urlRes.rows[0].id;

  await pool.query(
    `INSERT INTO clicks (url_id, referrer, user_agent) VALUES ($1, $2, $3)`,
                   [urlId, req.get("referer") || null, req.get("user-agent") || null]
  );
  await pool.query(`UPDATE urls SET click_count = click_count + 1 WHERE id = $1`, [urlId]);
}


export default router;
