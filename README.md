# BilingualMath — Билингвальный математический словарь

Интерактивный справочник математических терминов на русском и тувинском языках.

## Технологический стек
- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend:** Node.js, Express, PostgreSQL (pg).
- **Security:** JWT Authentication, bcrypt, express-rate-limit.
- **Compliance:** Соответствие ФЗ-152 (Минимизация данных, согласие на обработку).

## Установка и запуск (Локально)

1. Установите зависимости:
   ```bash
   npm install
   ```
2. Создайте файл `.env` на основе `.env.example` и укажите `JWT_SECRET` и параметры подключения к PostgreSQL.
3. Запустите проект:
   ```bash
   npm run dev
   ```

## Деплой на сервер (Ubuntu/Debian)

### 1. Подготовка сервера
Установите Node.js, PostgreSQL, Nginx и PM2:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib nginx
sudo npm install -g pm2
```

### 2. Настройка PostgreSQL
Создайте базу данных и пользователя:
```bash
sudo -u postgres psql
CREATE DATABASE bilingvmath;
CREATE USER bilingv_user WITH ENCRYPTED PASSWORD 'ваш_пароль';
GRANT ALL PRIVILEGES ON DATABASE bilingvmath TO bilingv_user;
\q
```

### 3. Клонирование и сборка
```bash
git clone <your-repo-url>
cd bilingvmath
npm install
npm run build
```

### 4. Настройка окружения
Создайте `.env` и укажите:
```env
NODE_ENV=production
JWT_SECRET=ваш_очень_длинный_секретный_ключ
DATABASE_URL=postgresql://bilingv_user:ваш_пароль@localhost:5432/bilingvmath
```

### 5. Запуск через PM2
```bash
pm2 start server.ts --name bilingvmath --interpreter node_modules/.bin/tsx
pm2 save
pm2 startup
```

### 6. Настройка Nginx
Создайте конфиг `/etc/nginx/sites-available/bilingvmath`:
```nginx
server {
    listen 80;
    server_name bilingvmath.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Активируйте и перезапустите Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/bilingvmath /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL (Certbot)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d bilingvmath.ru
```

## Резервное копирование
- **База данных:** Используйте `pg_dump` для создания дампов PostgreSQL.
- **Экспорт терминов:** Доступен в панели Супер-админа в формате JSON.

## Соответствие ФЗ-152
1. Сервер **должен** находиться на территории РФ (например, Selectel, Timeweb, Yandex Cloud).
2. Ссылка на Политику конфиденциальности должна быть обновлена в `Footer.tsx`.
3. Пользователь дает согласие при регистрации.
