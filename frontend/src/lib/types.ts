export type Place = {
  id: string;
  name: string;
  neighborhood: string;
  summary: string;
};

export type Trip = {
  id: string;
  title: string;
  origin: string;
  destination: string;
  summary: string;
};

export type UserProfile = {
  id: string;
  name: string;
  neighborhood: string;
};
