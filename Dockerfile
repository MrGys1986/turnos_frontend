# Etapa 1: Build con Node
FROM node:20-alpine AS build
WORKDIR /app

# Copiamos dependencias e instalamos
COPY package*.json ./
RUN npm install

# Copiamos el resto del código y hacemos el build
COPY . .
RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Copiamos la build generada en dist/
COPY --from=build /app/dist .

# Copiamos configuración de Nginx para SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
