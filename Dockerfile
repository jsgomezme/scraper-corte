# Dockerfile

# Paso 1: Usar una imagen base oficial de Node.js.
# La versión 20 es una LTS (Long-Term Support) estable y moderna.
FROM node:20-slim

# Establecer el directorio de trabajo dentro del contenedor.
WORKDIR /usr/src/app

# Instalar las dependencias del sistema operativo necesarias para que Puppeteer (Chromium) se ejecute.
# Este es el paso más importante y el que suele fallar en despliegues.
# La lista incluye librerías para renderizado, fuentes, y utilidades de red.
RUN apt-get update \
    && apt-get install -yq --no-install-recommends \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \

    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    # Limpiar el caché de apt para reducir el tamaño de la imagen
    && rm -rf /var/lib/apt/lists/*

# Copiar los archivos de definición del proyecto (package.json y package-lock.json).
# Esto aprovecha el cacheo de capas de Docker. Si estos archivos no cambian,
# no se volverán a instalar las dependencias.
COPY package*.json ./

# Instalar las dependencias de Node.js.
# Puppeteer descargará su propia versión de Chromium aquí.
RUN npm install

# Copiar el resto del código de la aplicación.
COPY . .

# Exponer el puerto que la aplicación usará.
# Google Cloud Run dirigirá el tráfico a este puerto.
EXPOSE 8080

# Definir el comando para ejecutar la aplicación cuando se inicie el contenedor.
CMD [ "npm", "start" ]
