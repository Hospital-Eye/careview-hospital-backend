const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { Types } = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

//MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use(express.json());

//create a new Mongoose model dynamically
function createModelForCollection(collectionName) {
  const schema = new mongoose.Schema({}, { strict: false }); 
  return mongoose.model(collectionName, schema);
}

//route to import JSON data
app.post('/import', async (req, res) => {
  try {
    const files = fs.readdirSync(path.join(__dirname, 'data')); 

    for (let file of files) {
      if (file.endsWith('.json')) { 
        const filePath = path.join(__dirname, 'data', file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8')); 

        //set collection name from the file name 
        const collectionName = file.replace('.json', '');

        const DynamicModel = createModelForCollection(collectionName);

        const formattedData = data.map(item => {
          if (item._id) {
            item._id = new Types.ObjectId(item._id['$oid']); //convert the $oid to ObjectId
          }
          return item;
        });

        await DynamicModel.insertMany(formattedData); 
        console.log(`Data inserted into ${collectionName} collection.`);
      }
    }

    res.send('Data imported successfully into respective collections.');
  } catch (err) {
    res.status(500).send('Error importing data: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
