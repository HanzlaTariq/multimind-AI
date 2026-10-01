import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 _id:{type:String,default:'automation'},enabled:{type:Boolean,default:true},chargeTests:{type:Boolean,default:false},
 maxRunCredits:{type:Number,default:10000,min:0,max:2000000},revision:{type:Number,default:1},
},{timestamps:true});
export default mongoose.models.AutomationCreditPolicy||mongoose.model('AutomationCreditPolicy',schema);
