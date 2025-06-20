const mongoose = require('mongoose');


const itemSchema = new mongoose.Schema({
  data: mongoose.Schema.Types.Mixed, //allows any structure for the data
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
