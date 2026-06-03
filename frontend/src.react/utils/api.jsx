import axios from 'axios';
import { useEffect } from 'react';
const baseURL = import.meta.env.VITE_API_BASE_URL;

export async function fetchData(endpoint) {
  try {
    const response = await axios.get(baseURL + endpoint);
    return response.data;
  } catch (error) {
    console.error('There was an error!', error);
    throw error;
  }
}


export async function postData(endpoint, data) {
  try {
    const response = await axios.post(baseURL + endpoint, data);
    return response.data;
  } catch (error) {
    console.error('There was an error!', error);
    throw error;
  }
}


export async function putData(endpoint, data) {
  try {
    const response = await axios.put(baseURL + endpoint, data);
    return response.data;
  } catch (error) {
    console.error('There was an error!', error);
    throw error;
  }
}


export async function deleteData(endpoint) {
  try {
    const response = await axios.delete(baseURL + endpoint);
    return response.data;
  } catch (error) {
    console.error('There was an error!', error);
    throw error;
  }
}

