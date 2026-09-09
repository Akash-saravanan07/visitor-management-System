module.exports = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running on Vercel"
  });
};
