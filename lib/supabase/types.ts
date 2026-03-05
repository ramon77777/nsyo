export type SiteSetting = {
  key: string;
  value: any;
};

export type ContentBlock = {
  key: string;
  type: "text" | "richtext" | "list" | "json";
  value: any;
  order_index: number;
};

export type Page = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
};
