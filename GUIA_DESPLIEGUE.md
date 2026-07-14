# Guía de Despliegue en la Web (Gratis y 24/7)

Para que tu sitio web y sistema de citas de **KolyMedical** estén en línea de forma permanente (sin que se apaguen si tu PC se apaga) y con costo S/ 0, sigue estos sencillos pasos:

---

## Opción A: Despliegue mediante GitHub y Vercel (Recomendado)

Esta opción te permite realizar cambios en tu PC y subirlos a la web automáticamente. Es la más profesional y 100% gratuita.

### 1. Subir tu proyecto a GitHub
1. Si no tienes una cuenta de GitHub, créala en [github.com](https://github.com).
2. Descarga e instala **Git** si no lo tienes.
3. Abre una terminal (o Git Bash) en la carpeta del proyecto y ejecuta:
   ```bash
   git init
   git add .
   git commit -m "primer commit kolymedical"
   ```
4. En GitHub, crea un nuevo repositorio llamado `kolymedical-web` (selecciónalo como **Público** o **Privado**).
5. Copia los comandos que te da GitHub para emparejar el repositorio local y ejecuta en tu terminal:
   ```bash
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/kolymedical-web.git
   git push -u origin main
   ```

### 2. Conectar con Vercel
1. Crea una cuenta en [vercel.com](https://vercel.com) (puedes iniciar sesión usando tu cuenta de GitHub con un solo clic).
2. Haz clic en **"Add New"** > **"Project"**.
3. Importa el repositorio `kolymedical-web` que acabas de subir.
4. Haz clic en **"Deploy"**.
5. ¡Listo! En menos de 1 minuto, Vercel te dará una URL pública gratuita (ej. `kolymedical-web.vercel.app`) donde tu web estará activa 24/7.

---

## Opción B: Despliegue Directo sin GitHub (En 2 Minutos)

Si no deseas configurar Git o GitHub por ahora y quieres subir la web inmediatamente:

1. Ve a **[netlify.com](https://www.netlify.com)** y crea una cuenta gratuita.
2. Ingresa a tu panel de Netlify y ve a la pestaña **Sites**.
3. Verás una sección abajo que dice **"Want to deploy a new site without connecting to Git? Drag and drop your site folder here"** (Arrastra y suelta aquí la carpeta de tu sitio).
4. Arrastra la carpeta `kolymedical-web` completa a esa área.
5. ¡Listo! En segundos tu sitio estará en línea con una URL gratuita de Netlify (ej. `kolymedical.netlify.app`).

---

## 🌐 Configurar un Dominio Propio (Pago Mínimo)

Si en el futuro deseas que la dirección sea `www.kolymedical.com` o `www.kolymedical.pe` en lugar de `.vercel.app`:

1. Compra el dominio en cualquier registrador (ej. **Namecheap**, **Porkbun** o **GoDaddy** por aprox. S/ 35 al año).
2. Ingresa al panel de configuración de tu proyecto en Vercel o Netlify.
3. Ve a **Settings > Domains** e ingresa tu nuevo dominio.
4. El sistema te dará unos registros de red (tipo A o CNAME). Cópialos en el administrador de DNS de donde compraste tu dominio.
5. Vercel/Netlify configurarán el certificado SSL (HTTPS) de forma automática y gratuita.

---

## 🗄️ Conectar a una Base de Datos Real de Supabase (Gratis)

Actualmente, las citas se guardan en el navegador (`localStorage`) para que puedas usar la web y el calendario de inmediato sin depender de internet o configuraciones complejas. 

Si deseas habilitar una base de datos en la nube (para que lo que agende un paciente se vea inmediatamente en la PC del administrador en tiempo real):
1. Regístrate gratis en **[supabase.com](https://supabase.com)** y crea un proyecto.
2. En la sección SQL Editor, ejecuta este comando para crear la tabla de citas:
   ```sql
   create table appointments (
     id text primary key,
     patient_name text,
     patient_age integer,
     patient_phone text,
     service_id text,
     specialist_id text,
     date date,
     time text,
     modality text,
     status text
   );
   ```
3. En tu archivo `app.js` de la web, reemplaza la lógica de lectura/escritura de `DB` para apuntar a la API de Supabase utilizando las llaves provistas en tu panel de Supabase.
