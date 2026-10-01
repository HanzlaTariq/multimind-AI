import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},name:{type:String,required:true,maxlength:80},type:{type:String,enum:['bearer','basic','header','slackWebhook','discordWebhook','telegram'],required:true},headerName:{type:String,default:'X-API-Key'},secret:{type:String,required:true,select:false}},{timestamps:true});
export default mongoose.models.FlowCredential||mongoose.model('FlowCredential',schema);
