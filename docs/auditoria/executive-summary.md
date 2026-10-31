# Resumen de la auditoría de la web de VuelaClic

**31 de octubre de 2026**

## En una frase

La demo está bien construida y es segura para enseñarla. Antes de convertirla en la web real hace falta un servidor que guarde los datos y controle el acceso. Además hay que arreglar unos pocos detalles de accesibilidad y de coherencia.

## Lo que está bien

- **No se puede inyectar código** a través de los formularios: todo lo que escribe el cliente se muestra de forma segura.
- **Funciona en cualquier pantalla**, de móvil pequeño a monitor grande, también en modo noche.
- **Carga rápido:** el globo 3D y las fotos solo se descargan cuando hacen falta.
- **Cumplimiento legal bien encaminado:** aceptación de condiciones antes de pagar, ofertas con permiso separado y sin cookies de seguimiento.
- **Preparada para GrupoVDT:** la conexión real se cambia en un solo sitio, sin rehacer la web.

## Lo importante (prioridad alta)

1. **El acceso al panel de la agencia solo funciona como demo.** Alguien con conocimientos lo abre sin contraseña. No es grave ahora, porque solo hay datos inventados. Para la web real, el acceso tiene que comprobarlo un servidor.
2. **Personas que usan solo el teclado.** Al elegir asiento o vuelo, la página les devuelve al principio. Se arregla en una hora.
3. **Los datos de los clientes se guardan en el navegador.** Está bien para la demo. En la web real tienen que guardarse en un servidor protegido, por la ley de protección de datos.
4. **Antes de lanzar hay que quitar lo que es de demo:** que no aparezca en Google, el botón de "datos de prueba" y los avisos de demostración. También hay que completar con un abogado los datos de empresa de la página legal y conectar los pagos reales.

## Mejoras recomendadas (prioridad media)

- **Financiación.** Si la agencia la desactiva en el panel, los resultados siguen anunciando "100 € hoy y 6 cuotas". Debe desaparecer en todas partes.
- **Contraste.** Algunos textos pequeños (el botón verde de WhatsApp, "Directo", los pasos de la reserva) se leen mal.
- **Protección extra del servidor web.** Faltan unas cabeceras de seguridad que se añaden en Netlify en minutos.
- **Documento interno publicado.** El documento con el guion de la demo y sus claves de prueba se puede abrir desde internet.
- **Tipografías.** Ahora se cargan desde Google, que recibe la IP de cada visitante. Es mejor servirlas desde la propia web.
- **Mensajes de "cuotas sin intereses".** Hay que confirmar con Fliinow y el asesor legal si deben ir acompañados de un ejemplo con TAE.

## Detalles menores

- Falta el icono de la pestaña: ahora sale el de Netlify.
- Falta la imagen y el texto que se ven al compartir el enlace por WhatsApp o redes.
- En "multidestino" se puede escribir a mano un segundo tramo anterior al primero.
- Pequeños ajustes de código para que sea más fácil de mantener.

## Siguiente paso

El plan de arreglos ([remediation-plan.md](remediation-plan.md)) está ordenado por prioridad. Los arreglos de la demo (accesibilidad, financiación, contraste, cabeceras, icono y documento publicado) suman unas **5 horas**. Lo del servidor real va aparte, junto con la integración de GrupoVDT y los pagos.
