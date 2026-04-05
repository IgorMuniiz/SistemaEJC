const mongoose = require('mongoose');

const subSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: { type: Object, required: true },
});

module.exports = mongoose.model('PushSubscription', subSchema);
