const error = (message, data) => {
  return {
    success: false,
    message,
    data,
  };
};

const success = (message, data) => {
  return {
    success: true,
    message,
    data,
  };
};

const ResponseHelper = {
  error,
  success,
};

module.exports = ResponseHelper;
