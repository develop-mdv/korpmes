# CorpMessenger

Корпоративный мессенджер с поддержкой чатов, звонков (аудио/видео), задач, файлов и уведомлений.

## Стек

| Слой | Технология |
|------|-----------|
| Backend | NestJS, TypeORM, PostgreSQL 16, Redis 7 |
| Frontend | React 19, Vite, React Router v7 |
| Mobile | React Native 0.76, Expo SDK 52 |
| Storage | MinIO (S3-совместимый) |
| WebRTC | CoTURN |
| Инфраструктура | Docker Compose, nginx, Let's Encrypt |

## Структура

```
apps/
  api/      — NestJS backend (порт 3000)
  web/      — React + Vite frontend
  mobile/   — Expo (Android/iOS)
packages/
  shared-types/       — TypeScript типы
  shared-constants/   — Общие константы (WS события и др.)
  shared-validation/  — Zod схемы валидации
infrastructure/
  docker/   — Dockerfile'ы и nginx.conf для контейнеров
  nginx/    — Конфиг хостового nginx (SSL, домен)
```

## Локальная разработка

### Требования
- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose

### Запуск

```bash
# Установить зависимости
pnpm install

# Запустить инфраструктуру (postgres, redis, minio)
docker compose -f docker-compose.dev.yml up -d

# Скопировать и настроить переменные окружения
cp .env.example .env

# Запустить всё (api + web)
pnpm dev
```

API доступен на `http://localhost:3000`, веб на `http://localhost:5173`.

### Миграции БД

```bash
pnpm --filter @corp/api db:migrate
pnpm --filter @corp/api db:seed   # опционально
```

## Переменные окружения

Все переменные описаны в `.env.example`. Обязательные для production:

| Переменная | Описание |
|-----------|---------|
| `JWT_ACCESS_SECRET` | Секрет для access-токенов (мин. 32 символа) |
| `JWT_REFRESH_SECRET` | Секрет для refresh-токенов (мин. 32 символа) |
| `DB_PASSWORD` | Пароль PostgreSQL |
| `MINIO_ROOT_PASSWORD` | Пароль MinIO admin |

## Production деплой

Деплой выполняется через GitHub Actions.

### Первоначальная установка на сервер

1. Настроить GitHub Secrets в репозитории:
   - `SERVER_HOST` — IP сервера
   - `SERVER_USER` — пользователь SSH (например `root`)
   - `SERVER_SSH_KEY` — приватный SSH ключ
   - `JWT_ACCESS_SECRET` — случайная строка 64+ символа
   - `JWT_REFRESH_SECRET` — случайная строка 64+ символа

2. Запустить workflow вручную: **Actions → Deploy to Production → Run workflow**

Workflow автоматически:
- Установит Docker, nginx, certbot (если не установлены)
- Получит SSL-сертификат для домена через Let's Encrypt
- Запустит все сервисы через Docker Compose
- Выполнит миграции БД

### Автообновление

При каждом push в ветку `main` автоматически пересобираются и перезапускаются контейнеры `api` и `web` без остановки базы данных и Redis.

## Мобильное приложение (EAS Build)

```bash
cd apps/mobile
eas build --platform android --profile preview
```

APK доступен на [expo.dev](https://expo.dev/accounts/mayboroda/projects/corpmessenger).

API URL для production-билда задаётся через переменную `EXPO_PUBLIC_API_URL` в профиле `preview` в `eas.json`.
