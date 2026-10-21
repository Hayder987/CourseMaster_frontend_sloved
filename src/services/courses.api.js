import api from "./api";

export const getCourses = (params, config = {}) => {
  return api.get("/courses", { ...config, params });
};

export const getCourseById = (id) => {
  return api.get(`/courses/${id}`);
};
