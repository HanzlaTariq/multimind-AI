/**
 * Real installed Mongoose is required. No MongoDB connection or .env is used.
 * The collection's updateOne is intercepted AFTER Mongoose casting/validation.
 * This verifies the schema and query pipeline, NOT persistence or Mongo races.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoosePackage = require('mongoose');

function fixture() {
  const mongoose = new mongoosePackage.Mongoose();
  mongoose.set('bufferCommands', false);
  mongoose.set('autoCreate', false);
  mongoose.set('autoIndex', false);
  const source = fs.readFileSync(path.join(__dirname, '../../models/User.js'), 'utf8')
    .replace(/^import mongoose from ["']mongoose["'];\s*$/m, '')
    .replace(/^export default /m, 'return ');
  // Evaluate only this local model with an isolated real Mongoose instance.
  // Do not change package.json module mode or load the application's secrets.
  const User = new Function('mongoose', source)(mongoose);
  const userId = new mongoose.Types.ObjectId();
  return { mongoose, User, userId };
}
const unit = (key='step_1', status='started') => ({
  key, type:'ready.cleanRows', label:'Trim row whitespace', cost:1, status,
});
const hold = (units=[]) => ({
  key:'tool_schema_regression', scope:'ready-tool', reference:'regression',
  label:'Clean & rank a dataset', reserved:3, revision:0,
  cycle:new Date('2026-10-01T00:00:00Z'), createdAt:new Date(),
  expiresAt:new Date(Date.now()+600000), units,
});
function intercept(User) {
  const calls = [];
  User.collection.updateOne = async function(filter, update, options) {
    calls.push({filter,update,options});
    return {acknowledged:true,matchedCount:1,modifiedCount:1};
  };
  return calls;
}

test('billing units compile to document arrays with their own string type field', () => {
  const {User} = fixture();
  const units = User.schema.path('automationCreditHolds').schema.path('units');
  assert.equal(units.$isMongooseDocumentArray, true);
  for (const name of ['key','type','label','status']) assert.equal(units.schema.path(name).instance, 'String');
  assert.equal(units.schema.path('cost').instance, 'Number');
  assert.equal(units.schema.options._id, false);
});

test('a user validates with complete per-node billing objects', () => {
  const {User} = fixture();
  const user = new User({name:'Regression Test',email:'regression@example.test',automationCreditHolds:[hold([unit()])]});
  assert.equal(user.validateSync(), undefined);
  assert.deepEqual(user.automationCreditHolds[0].units[0].toObject(), unit());
});

test('empty holds keep units as an empty document array', () => {
  const {User} = fixture();
  const value = hold(); delete value.units;
  const user = new User({name:'Regression Test',email:'regression@example.test',automationCreditHolds:[value]});
  assert.equal(user.validateSync(), undefined);
  assert.deepEqual(user.automationCreditHolds[0].units.toObject(), []);
});

test('the old shorthand reproduces the original string-array cast error', () => {
  const {mongoose} = fixture();
  const broken = new mongoose.Schema({units:[{key:String,type:String,label:String,cost:Number,status:String,_id:false}]});
  const Broken = mongoose.model('BrokenBillingShape', broken);
  const error = new Broken({units:[unit()]}).validateSync();
  assert.ok(error, 'old schema must reject the object so this test guards the actual regression');
  assert.match(error.message, /Cast to \[string\]/);
});

test('exact wallet start $push reaches the collection with an object, not a string', async () => {
  const {User,userId} = fixture(), calls = intercept(User);
  await User.updateOne(
    {_id:userId,banned:{$ne:true},automationCreditHolds:{$elemMatch:{key:hold().key,'units.key':{$ne:'step_1'}}}},
    {$push:{'automationCreditHolds.$.units':unit()},$inc:{'automationCreditHolds.$.revision':1}},
    {runValidators:true},
  );
  assert.equal(calls.length, 1);
  const value = calls[0].update.$push['automationCreditHolds.$.units'];
  assert.equal(typeof value, 'object');
  assert.equal(value.type, 'ready.cleanRows');
  assert.equal(value.cost, 1);
  assert.equal(value.status, 'started');
});

test('reserve update accepts nested units without generating extra unit ids', async () => {
  const {User,userId} = fixture(), calls = intercept(User);
  await User.updateOne({_id:userId},{$inc:{credits:-3},$push:{automationCreditHolds:hold([unit()])}},{runValidators:true});
  const value = calls[0].update.$push.automationCreditHolds;
  assert.equal(value.units[0].type, 'ready.cleanRows');
  assert.equal(value.units[0]._id, undefined);
  assert.equal(value._id, undefined);
});

test('wallet finish casts both nested positional arrays and preserves status', async () => {
  const {User,userId} = fixture(), calls = intercept(User);
  await User.updateOne(
    {_id:userId,automationCreditHolds:{$elemMatch:{key:hold().key,units:{$elemMatch:{key:'step_1',status:'started'}}}}},
    {$set:{'automationCreditHolds.$[hold].units.$[unit].status':'success'},$inc:{'automationCreditHolds.$[hold].revision':1}},
    {arrayFilters:[{'hold.key':hold().key},{'unit.key':'step_1','unit.status':'started'}],runValidators:true},
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].update.$set['automationCreditHolds.$[hold].units.$[unit].status'], 'success');
  assert.equal(calls[0].options.arrayFilters[1]['unit.key'], 'step_1');
});

test('atomic settlement retains the object receipt and unused-credit refund', async () => {
  const {User,userId} = fixture(), calls = intercept(User);
  const receipt = {key:hold().key,units:[unit('step_1','success')],reserved:3,charged:1,refunded:2};
  await User.updateOne(
    {_id:userId,automationCreditHolds:{$elemMatch:{key:hold().key,revision:1}}},
    {$inc:{credits:2},$pull:{automationCreditHolds:{key:hold().key}},$push:{automationCreditReceipts:{$each:[receipt],$position:0,$slice:20}}},
  );
  assert.equal(calls[0].update.$inc.credits, 2);
  assert.equal(calls[0].update.$push.automationCreditReceipts.$each[0].units[0].type, 'ready.cleanRows');
});

test('multiple step outcomes remain distinct objects during hydration', () => {
  const {User,userId} = fixture();
  const user = User.hydrate({_id:userId,name:'Regression Test',email:'regression@example.test',automationCreditHolds:[hold([unit('a','success'),unit('b','failed'),unit('c','uncertain')])]});
  assert.deepEqual(user.automationCreditHolds[0].units.map(value=>value.status), ['success','failed','uncertain']);
  assert.equal(user.automationCreditHolds[0].units[1].cost, 1);
});

test('wallet privacy, existing credit default, themes, and admin controls stay intact', () => {
  const {User} = fixture();
  assert.equal(User.schema.path('automationCreditHolds').options.select, false);
  assert.equal(User.schema.path('automationCreditReceipts').options.select, false);
  assert.equal(User.schema.path('credits').options.default, 60);
  assert.deepEqual(User.schema.path('theme').enumValues, ['midnight','light','nord','sepia']);
  assert.equal(User.schema.path('isAdmin').options.default, false);
  assert.equal(User.schema.path('banned').options.default, false);
});
