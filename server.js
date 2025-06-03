require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const mqtt = require("mqtt");

const app = express();
const port = process.env.PORT || 3000;

const mqttClient = mqtt.connect("mqtt://maqiatto.com", {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS
});

app.post("/webhook", bodyParser.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_ENDPOINT_SECRET);
  } catch (err) {
    console.error("❌ Error verificando webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("✅ Pago recibido:", session.id);

    mqttClient.publish("esp32/pago", "ok");
  }

  res.status(200).send("OK");
});

app.get("/", (req, res) => {
  res.send("Servidor Stripe → MQTT activo");
});

app.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
});
