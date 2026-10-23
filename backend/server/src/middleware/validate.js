// Validates + sanitizes req[source] against a Joi schema
export const validate = (schema, source = 'body') => (req, res, next) => {
  const { value, error } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
  req[source] = value;
  next();
};
