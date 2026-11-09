FROM mcr.microsoft.com/playwright:v1.49.1-jammy

USER root
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC
RUN apt-get update \
    && apt-get install -y --no-install-recommends xvfb x11vnc novnc websockify \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/capture
COPY package.json ./
RUN npm install --omit=dev
COPY capture.mjs state.mjs server.mjs entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENV DISPLAY=:99
EXPOSE 6080 7900
ENTRYPOINT ["./entrypoint.sh"]
