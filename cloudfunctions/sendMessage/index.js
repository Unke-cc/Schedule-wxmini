// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'c-s-5gpguyfs450d7163'
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { templateId, openId, data } = event;
  
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openId,
      templateId: templateId,
      data: data,
      miniprogramState: 'formal' // 正式版
    });
    return result;
  } catch (err) {
    console.error(err);
    return err;
  }
} 