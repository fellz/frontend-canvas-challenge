# Канвас «текст → генератор → результат» на React Flow — решение тестового (React 19 + TypeScript)

Редактор нод с сохранением графа через REST (ETag / `If-Match`) и имитацией генерации
изображения. Бэкенд, контракты и условия — от [instatdigital](https://github.com/instatdigital/frontend-canvas-challenge);
всё в `apps/web` — моё.

**Стек:** React 19 · TypeScript · Vite · `@xyflow/react` (React Flow 12) · react-router · TanStack Query.

**Ключевые решения**

- Очередь сохранений (`saver.ts`): debounce, строго последовательные PUT, flush перед запуском генерации, обработка 412 (устаревший ETag) и потери ответа.
- Ноды не получают функций через `data`: контекст канваса даёт им `saver` и индекс генераций, а правки идут через API React Flow (`updateNodeData`, `deleteElements`) → `onNodesChange`, поэтому «нужно ли сохранять» решается в одном месте по типу изменения (`position/add/remove/replace` — да, `select/dimensions` — нет).
- Постоянные и служебные поля разделены: на сервер уходят только `id/type/position/data` у нод и `id/source/target` у связей.
- Правило связей (типы нод, один вход, один выход генератора) — отдельный модуль, не размазан по компонентам.

Устройство, проверенные сценарии и недоработки — в **[apps/web/README.md](apps/web/README.md)**.
Первое тестовое из той же пары — оформление заказа: [frontend-checkout-challenge](https://github.com/fellz/frontend-checkout-challenge)
(и вариант [без TanStack Query](https://github.com/fellz/frontend-checkout-challenge-plain)).

---

## Условия задания (от instatdigital)

Нужно сделать редактор с нодами «текст → генератор → результат», сохранением через REST и имитацией генерации изображения. Бэкенд готов, фронтенд добавьте в `apps/web`.

Для отбора нужно выполнить оба тестовых: [оформление заказа](https://github.com/instatdigital/frontend-checkout-challenge) и [канвас на React Flow](https://github.com/instatdigital/frontend-canvas-challenge). Пришлите ссылки на оба решения.

[Условия задания](docs/ASSIGNMENT.md) · [Работа с API](docs/INTEGRATION.md) · [Критерии оценки](docs/EVALUATION.md)

Главный критерий — обобщение кода и минимум повторяющихся операций. Одинаковые проверки HTTP-ответов и разбор ошибок в компонентах недопустимы. Отдельно оцениваем стоимость обработки данных: лишние проходы, копирования и повторные поиски снижают результат.

## Запуск

Потребуются Node.js 24.x и npm 11.x. База данных и ключи внешних сервисов не нужны.

```sh
git clone https://github.com/instatdigital/frontend-canvas-challenge.git
cd frontend-canvas-challenge
npm ci
npm run dev
```

Фронтенд — в отдельном терминале:

```sh
npm run dev:web      # http://localhost:5173
npm run build:web    # сборка в apps/web/dist
npm run preview:web  # просмотр собранного
```

Устройство фронтенда, очередь сохранений, проверенные сценарии и недоработки — в [apps/web/README.md](apps/web/README.md).

Swagger: [http://localhost:4001/docs/](http://localhost:4001/docs/). Спецификация: [http://localhost:4001/openapi.json](http://localhost:4001/openapi.json) и [файл в репозитории](docs/openapi.json).

В Swagger создайте пространство через `POST /api/spaces`, затем получите его граф. Авторизация не нужна. Все пространства видны в одном локальном экземпляре сервера.

## Структура и команды

```text
apps/api/             бэкенд
apps/web/             ваш фронтенд
packages/contracts/   схемы API и типы TypeScript
docs/                 задание и документация
scripts/              проверки
```

Назовите приложение в `apps/web` как `@canvas/web` и добавьте команды его запуска в README решения. Пока фронтенда нет, `npm run dev` запускает только API.

```sh
npm run check       # форматирование, сборка, тесты, OpenAPI
npm run build
npm start           # собранный бэкенд
npm run smoke       # проверка по HTTP; API должен работать
```

## Настройки

Адрес по умолчанию — `127.0.0.1:4001`. При необходимости скопируйте `.env.example` в `.env` и измените `PORT`. Для проверки другого адреса: `BASE_URL=http://localhost:4101 npm run smoke`.

Фронтенд может работать на любом HTTP-порту `localhost`, `127.0.0.1` или `[::1]`. Другие адреса задаются в `CORS_ORIGINS`. Cookies не нужны.

Данные сохраняются в `.data/store.json`. Используйте один процесс API на один файл. Для сброса остановите сервер и выполните `npm run data:reset`. Если меняли `DATA_FILE`, свой файл удалите вручную при остановленном сервере.

Генерация тестовая: после заданной задержки сервер возвращает локальное SVG-изображение или ошибку сценария. Внешних запросов и списаний нет.

Корневые команды сборки и тестов проверяют бэкенд. В решении добавьте отдельные команды запуска и сборки `apps/web`, а после установки его зависимостей обновите корневой `package-lock.json`. Схемы API в `packages/contracts` можно использовать напрямую или описать нужные типы у себя.
