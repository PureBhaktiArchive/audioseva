export interface IUser {
  timestamp?: number;
  emailAddress: string;
  phoneNumber?: string;
  isAvailableOnWhatsApp?: boolean;
  languages?: { [key: string]: boolean };
  location?: any;
  name?: string;
  services?: string;
  roles?: { [key: string]: boolean };
  experience?: any;
  influencer?: any;
  recommendedBy?: any;
  status?: string;
  notes?: string;
  uploadCode?: any;
}
