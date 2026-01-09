FROM node:20-alpine as base

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache dumb-init

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copiar archivos de dependencias con ownership correcto
COPY --chown=nodejs:nodejs package-lock.json .
COPY --chown=nodejs:nodejs package.json .

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente con ownership correcto
COPY --chown=nodejs:nodejs src/ src/

# Cambiar usuario (ya no es necesario chown recursivo)
USER nodejs

# Configurar variables de entorno
ENV NODE_ENV=production
ENV ENVIRONMENT=azure

# Exponer puerto
EXPOSE 1812/udp

# Usar dumb-init para manejo de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["npm", "start"]