# ProductsBackend API contract

This document describes the implemented HTTP contract used by ProductsApp. It is the source of truth for Swift `Codable` models, networking, and repositories.

## Local connection and startup

Local base URL for the iOS Simulator:

```text
http://127.0.0.1:3000
```

From the `ProductsBackend` repository:

```sh
cp .env.example .env.dev
npm ci
docker compose up -d mailpit
npm run dev
```

The six client-facing endpoints use the `/api/v1` prefix. The separate operational health check is:

```http
GET /health
```

```sh
curl --fail --silent --show-error http://127.0.0.1:3000/health
```

```json
{
  "status": "ok"
}
```

## Shared JSON models

All successful `/api/v1` responses have a required top-level `data` field. All product fields are required; only `rating` is nullable.

### Product

| Field | JSON type | Required | Nullable | Notes |
| --- | --- | --- | --- | --- |
| `id` | integer | Yes | No | Positive safe integer. |
| `title` | string | Yes | No | Non-empty; surrounding whitespace is removed by the backend. |
| `price` | number | Yes | No | Finite and greater than or equal to zero. No currency field is returned. |
| `description` | string | Yes | No | May be empty. |
| `category` | string | Yes | No | Non-empty; surrounding whitespace is removed by the backend. |
| `imageUrl` | string | Yes | No | Absolute HTTP or HTTPS URL. |
| `rating` | object | Yes | Yes | `null` when the upstream rating is missing or malformed. |
| `rating.rate` | number | When `rating` is non-null | No | From 0 through 5. |
| `rating.count` | integer | When `rating` is non-null | No | Non-negative safe integer. |

Example:

```json
{
  "id": 1,
  "title": "Fjallraven Backpack",
  "price": 109.95,
  "description": "Everyday backpack",
  "category": "men's clothing",
  "imageUrl": "https://example.test/products/1.png",
  "rating": {
    "rate": 3.9,
    "count": 120
  }
}
```

Valid nullable-rating example:

```json
{
  "id": 2,
  "title": "Unrated Product",
  "price": 25,
  "description": "No valid upstream rating",
  "category": "electronics",
  "imageUrl": "https://example.test/products/2.png",
  "rating": null
}
```

### Error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": {
      "q": [
        "q must contain between 1 and 100 characters."
      ]
    }
  }
}
```

| Field | JSON type | Required | Nullable | Notes |
| --- | --- | --- | --- | --- |
| `error` | object | Yes | No | Error envelope. |
| `error.code` | string | Yes | No | Stable machine-readable code. |
| `error.message` | string | Yes | No | Safe display/logging message. |
| `error.details` | object keyed by field name, values `[String]` | No | No | Present for field validation errors; absent for most other errors. |

## 1. Home

```http
GET /api/v1/home
```

```sh
curl --fail --silent --show-error http://127.0.0.1:3000/api/v1/home
```

No request parameters or body.

Success: `200 OK`

```json
{
  "data": {
    "featuredProducts": [
      {
        "id": 1,
        "title": "Featured Product 1",
        "price": 10,
        "description": "First configured product",
        "category": "electronics",
        "imageUrl": "https://example.test/products/1.png",
        "rating": { "rate": 4.8, "count": 100 }
      },
      {
        "id": 2,
        "title": "Featured Product 2",
        "price": 20,
        "description": "Second configured product",
        "category": "electronics",
        "imageUrl": "https://example.test/products/2.png",
        "rating": { "rate": 4.1, "count": 80 }
      },
      {
        "id": 3,
        "title": "Featured Product 3",
        "price": 30,
        "description": "Third configured product",
        "category": "jewelery",
        "imageUrl": "https://example.test/products/3.png",
        "rating": null
      },
      {
        "id": 4,
        "title": "Featured Product 4",
        "price": 40,
        "description": "Fourth configured product",
        "category": "men's clothing",
        "imageUrl": "https://example.test/products/4.png",
        "rating": { "rate": 3.7, "count": 42 }
      },
      {
        "id": 5,
        "title": "Featured Product 5",
        "price": 50,
        "description": "Fifth configured product",
        "category": "women's clothing",
        "imageUrl": "https://example.test/products/5.png",
        "rating": { "rate": 4.5, "count": 250 }
      }
    ]
  }
}
```

`featuredProducts` always contains exactly five products. Their order is exactly the ID order configured in `FEATURED_PRODUCT_IDS`; it is not rating order. If any configured ID is missing from the upstream catalogue, the endpoint returns `502 FEATURED_PRODUCTS_UNAVAILABLE` rather than a partial array.

Possible statuses: `200`, `502`, `500`.

## 2. Categories

```http
GET /api/v1/categories
```

```sh
curl --fail --silent --show-error http://127.0.0.1:3000/api/v1/categories
```

No request parameters or body.

Success: `200 OK`

```json
{
  "data": [
    "electronics",
    "jewelery",
    "men's clothing",
    "women's clothing"
  ]
}
```

Categories are deduplicated case-insensitively, retain the first upstream spelling, and are sorted alphabetically using English case-insensitive comparison. An empty catalogue produces `{ "data": [] }`.

Possible statuses: `200`, `502`, `500`.

## 3. Products in a category

```http
GET /api/v1/categories/:category/products
```

Path parameter:

| Parameter | Required | Rules |
| --- | --- | --- |
| `category` | Yes | URL-encoded string. After decoding and trimming: 1–100 characters. Matching is case-insensitive. |

Example request:

```http
GET /api/v1/categories/men%27s%20clothing/products
```

```sh
curl --fail --silent --show-error \
  'http://127.0.0.1:3000/api/v1/categories/men%27s%20clothing/products'
```

Success: `200 OK`

```json
{
  "data": {
    "category": "men's clothing",
    "topRated": [
      {
        "id": 3,
        "title": "Cotton Jacket",
        "price": 55.99,
        "description": "A highly rated jacket",
        "category": "men's clothing",
        "imageUrl": "https://example.test/products/3.png",
        "rating": { "rate": 4.7, "count": 500 }
      },
      {
        "id": 2,
        "title": "Slim Fit Shirt",
        "price": 22.3,
        "description": "A popular shirt",
        "category": "men's clothing",
        "imageUrl": "https://example.test/products/2.png",
        "rating": { "rate": 4.1, "count": 259 }
      }
    ],
    "additional": [
      {
        "id": 1,
        "title": "Backpack",
        "price": 109.95,
        "description": "An additional category product",
        "category": "men's clothing",
        "imageUrl": "https://example.test/products/1.png",
        "rating": null
      }
    ]
  }
}
```

Ranking is deterministic across all matching products:

1. Higher `rating.rate` first.
2. When rates tie, higher `rating.count` first.
3. When both tie, lower product `id` first.
4. Products with `rating: null` rank after all rated products; their mutual order is ascending `id`.

The first two ranked products are returned in `topRated`; every remaining product is returned in `additional`. A category containing one product returns one `topRated` product and an empty `additional` array. The response `category` uses the upstream spelling from the first matching product.

Possible statuses: `200`, `400 VALIDATION_ERROR`, `404 CATEGORY_NOT_FOUND`, `502`, `500`.

## 4. Product search

```http
GET /api/v1/products/search?q=:query
```

Query parameter:

| Parameter | Required | Rules |
| --- | --- | --- |
| `q` | Yes | Exactly one string value. Trimmed length must be 1–100 characters. |

Example request:

```http
GET /api/v1/products/search?q=jacket
```

```sh
curl --fail --silent --show-error \
  'http://127.0.0.1:3000/api/v1/products/search?q=jacket'
```

Success: `200 OK`

```json
{
  "data": [
    {
      "id": 3,
      "title": "Cotton Jacket",
      "price": 55.99,
      "description": "A jacket for winter",
      "category": "men's clothing",
      "imageUrl": "https://example.test/products/3.png",
      "rating": { "rate": 4.7, "count": 500 }
    }
  ]
}
```

Search is a case-insensitive substring match over `title` and `description` only. It does not search category names. Results are sorted by ascending product `id`. No matches is a successful response:

```json
{
  "data": []
}
```

Missing, blank, repeated, non-string, or longer-than-100-character `q` values return `400 VALIDATION_ERROR` with `details.q`.

Possible statuses: `200`, `400 VALIDATION_ERROR`, `502`, `500`.

## 5. Product details

```http
GET /api/v1/products/:id
```

Path parameter:

| Parameter | Required | Rules |
| --- | --- | --- |
| `id` | Yes | Base-10 positive safe integer without a sign, decimal point, whitespace, or leading zero. |

Example request:

```http
GET /api/v1/products/1
```

```sh
curl --fail --silent --show-error http://127.0.0.1:3000/api/v1/products/1
```

Success: `200 OK`

```json
{
  "data": {
    "id": 1,
    "title": "Fjallraven Backpack",
    "price": 109.95,
    "description": "Everyday backpack",
    "category": "men's clothing",
    "imageUrl": "https://example.test/products/1.png",
    "rating": { "rate": 3.9, "count": 120 }
  }
}
```

Possible statuses: `200`, `400 VALIDATION_ERROR`, `404 PRODUCT_NOT_FOUND`, `502`, `500`.

## 6. Submit an enquiry

```http
POST /api/v1/enquiries
Content-Type: application/json
```

Request body:

| Field | JSON type | Required | Nullable | Rules |
| --- | --- | --- | --- | --- |
| `name` | string | Yes | No | Trimmed; resulting length 1–100 characters. |
| `email` | string | Yes | No | Trimmed; at most 254 characters; must contain non-whitespace text around `@` and a dot in the domain portion. |
| `productId` | integer | Yes | No | JSON number; positive safe integer. Numeric strings are rejected. |
| `message` | string | No | No | Maximum 2,000 characters before trimming. A missing, empty, or whitespace-only string is treated as not provided. Explicit `null` is rejected. |

Unknown additional request fields are ignored by the current implementation.

Example request:

```json
{
  "name": "Asha Patel",
  "email": "asha@example.test",
  "productId": 1,
  "message": "Please contact me about this product."
}
```

```sh
curl --fail --silent --show-error \
  --request POST http://127.0.0.1:3000/api/v1/enquiries \
  --header 'Content-Type: application/json' \
  --data '{"name":"Asha Patel","email":"asha@example.test","productId":1,"message":"Please contact me about this product."}'
```

The backend validates the body, verifies that the product exists, composes a plain-text sales email containing customer and product details, and waits for SMTP recipient acceptance.

Success: `200 OK`

```json
{
  "data": {
    "submitted": true
  }
}
```

No success response is returned if product lookup or SMTP delivery fails.

Possible statuses: `200`, `400 VALIDATION_ERROR`, `404 PRODUCT_NOT_FOUND`, `413 PAYLOAD_TOO_LARGE`, `502 PRODUCT_SOURCE_UNAVAILABLE`, `502 PRODUCT_SOURCE_INVALID_RESPONSE`, `502 EMAIL_DELIVERY_FAILED`, `500 INTERNAL_ERROR`.

## Status and error-code reference

| HTTP status | Code | When returned |
| --- | --- | --- |
| `200` | — | Successful health, catalogue, detail, search, or enquiry response. |
| `400` | `VALIDATION_ERROR` | Invalid search query, category path value, product ID, or enquiry fields. `details` identifies fields. |
| `400` | `INVALID_JSON` | Request body declares JSON but cannot be parsed. |
| `404` | `PRODUCT_NOT_FOUND` | Product detail/enquiry product does not exist. |
| `404` | `CATEGORY_NOT_FOUND` | No products match the requested category. |
| `404` | `ROUTE_NOT_FOUND` | No registered route matches the request. |
| `413` | `PAYLOAD_TOO_LARGE` | JSON body exceeds 16 KB. |
| `502` | `PRODUCT_SOURCE_UNAVAILABLE` | Upstream network error, timeout, or non-success HTTP status. A timeout uses message `The product source request timed out.` |
| `502` | `PRODUCT_SOURCE_INVALID_RESPONSE` | Upstream JSON or required product fields are invalid. |
| `502` | `FEATURED_PRODUCTS_UNAVAILABLE` | A configured featured ID is missing or the configured list does not contain five entries. |
| `502` | `EMAIL_DELIVERY_FAILED` | SMTP throws, accepts no recipient, or rejects any recipient. |
| `500` | `INTERNAL_ERROR` | Unexpected server failure. |

Representative non-validation error:

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "The requested product was not found."
  }
}
```

Clients should decode `details` as optional and must not depend on undocumented upstream Fake Store fields.
