FROM eclipse-mosquitto:2

COPY mosquitto.conf /defaults/mosquitto.conf
COPY aclfile /defaults/aclfile
COPY start-mosquitto.sh /usr/local/bin/start-mosquitto.sh

RUN chmod +x /usr/local/bin/start-mosquitto.sh

CMD ["/usr/local/bin/start-mosquitto.sh"]
