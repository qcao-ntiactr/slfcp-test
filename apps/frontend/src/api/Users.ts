import apiClient from './axiosConfig';

export interface BackendUser {
  id: number;
  external_id: string;
  name: string;
  email: string;
  can_concur: boolean;
  entity_id: number;
  entity: {
    id: number;
    name: string;
    abbreviation: string;
    type: string;
    active: boolean;
  };
}

export const getUserByExternalId = async (
  externalId: string
): Promise<BackendUser> => {
  try {
    const { data } = await apiClient.get(`/users/${externalId}`);
    return data;
  } catch (error) {
    console.error('There was an error fetching user data:', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<BackendUser> => {
  try {
    const { data } = await apiClient.get(`/users/email/${email}`);
    return data;
  } catch (error) {
    console.error('There was an error fetching user data by email:', error);
    throw error;
  }
};
