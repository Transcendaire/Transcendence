FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY ssl/ /etc/nginx/ssl/

EXPOSE 8443
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
