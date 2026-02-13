// /Users/chengjiahui/blog/blog-data/utils/responseHelper.js

/**
 * 成功的响应
 * @param {object} res - Express 的 response 对象
 * @param {object|array} data - 要返回的数据
 * @param {string} msg - 成功信息
 * @param {number} total - (可选) 列表的总数，用于分页
 */
const success = (res, data, msg = '操作成功', total) => {
  const response = {
    code: 200,
    msg,
    data,
  };
  if (total !== undefined) {
    response.total = total;
  }
  res.status(200).json(response);
};

/**
 * 失败的响应
 * @param {object} res - Express 的 response 对象
 * @param {number} code - HTTP 状态码 (例如 400, 401, 404, 500)
 * @param {string} msg - 错误信息
 * @param {object} error - (可选) 原始错误对象
 */
const fail = (res, code, msg, error) => {
  console.error(msg, error || ''); // 在后端打印详细错误
  res.status(code).json({
    code,
    msg,
    data: null,
  });
};

module.exports = {
  success,
  fail,
};