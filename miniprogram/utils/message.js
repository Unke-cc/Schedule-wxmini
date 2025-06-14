const config = require('../config');

// 请求订阅消息权限
const requestSubscribeMessage = async (tmplIds) => {
  try {
    const res = await wx.requestSubscribeMessage({
      tmplIds: tmplIds
    });
    return res;
  } catch (error) {
    console.error('请求订阅消息失败：', error);
    return null;
  }
};

// 请求日程提醒的订阅消息权限
const requestScheduleReminder = () => {
  return requestSubscribeMessage([config.templateIds.scheduleReminder]);
};

// 请求未打卡提醒的订阅消息权限
const requestCheckInReminder = () => {
  return requestSubscribeMessage([config.templateIds.checkInReminder]);
};

module.exports = {
  requestScheduleReminder,
  requestCheckInReminder
}; 