-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_users (
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (user_id),
  CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.business_unit_section_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL,
  designation text NOT NULL,
  qty text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT business_unit_section_items_pkey PRIMARY KEY (id),
  CONSTRAINT business_unit_section_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.business_unit_sections(id)
);
CREATE TABLE public.business_unit_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_unit_id uuid NOT NULL,
  key text NOT NULL,
  title text NOT NULL,
  intro_text text,
  image_media_id uuid,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT business_unit_sections_pkey PRIMARY KEY (id),
  CONSTRAINT business_unit_sections_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id),
  CONSTRAINT business_unit_sections_image_media_id_fkey FOREIGN KEY (image_media_id) REFERENCES public.media(id)
);
CREATE TABLE public.business_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  page_title text,
  page_intro text,
  CONSTRAINT business_units_pkey PRIMARY KEY (id)
);
CREATE TABLE public.content_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL,
  key text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['text'::text, 'richtext'::text, 'list'::text, 'json'::text])),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_blocks_pkey PRIMARY KEY (id),
  CONSTRAINT content_blocks_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id)
);
CREATE TABLE public.media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind = ANY (ARRAY['image'::text, 'video'::text])),
  bucket text NOT NULL CHECK (bucket = ANY (ARRAY['images'::text, 'videos'::text])),
  path text NOT NULL,
  public_url text,
  title text NOT NULL,
  description text,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  duration_seconds integer,
  thumbnail_media_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT media_pkey PRIMARY KEY (id),
  CONSTRAINT media_thumbnail_media_id_fkey FOREIGN KEY (thumbnail_media_id) REFERENCES public.media(id)
);
CREATE TABLE public.page_media (
  page_id uuid NOT NULL,
  media_id uuid NOT NULL,
  section_key text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  CONSTRAINT page_media_pkey PRIMARY KEY (page_id, media_id, section_key),
  CONSTRAINT page_media_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id),
  CONSTRAINT page_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id)
);
CREATE TABLE public.pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'admin'::text CHECK (role = 'admin'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.project_media (
  project_id uuid NOT NULL,
  media_id uuid NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  CONSTRAINT project_media_pkey PRIMARY KEY (project_id, media_id),
  CONSTRAINT project_media_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_unit_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  location text,
  date date,
  category text,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id)
);
CREATE TABLE public.quote_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text,
  phone text,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'contact'::text,
  page_id uuid,
  status text NOT NULL DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'in_progress'::text, 'done'::text, 'spam'::text])),
  notes text,
  CONSTRAINT quote_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  public_url text,
  thumbnail_url text,
  is_published boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT videos_pkey PRIMARY KEY (id)
);