\restrict dbmate

-- Dumped from database version 18.4 (Homebrew)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: booking_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_source AS ENUM (
    'online',
    'phone',
    'walk_in'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'no_show'
);


--
-- Name: court_surface; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.court_surface AS ENUM (
    'indoor',
    'outdoor',
    'covered'
);


--
-- Name: payment_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_kind AS ENUM (
    'charge',
    'refund'
);


--
-- Name: reservation_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reservation_kind AS ENUM (
    'booking',
    'hold',
    'blackout'
);


--
-- Name: reservation_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reservation_state AS ENUM (
    'active',
    'released'
);


--
-- Name: sport; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sport AS ENUM (
    'pickleball',
    'badminton',
    'basketball',
    'volleyball',
    'tennis',
    'futsal'
);


--
-- Name: venue_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.venue_role AS ENUM (
    'owner',
    'staff'
);


--
-- Name: waitlist_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.waitlist_state AS ENUM (
    'waiting',
    'offered',
    'claimed',
    'expired',
    'cancelled'
);


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Amenity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Amenity" (
    slug text NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT amenity_slug_shape CHECK ((slug ~ '^[a-z][a-z0-9_]*$'::text))
);


--
-- Name: Booking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Booking" (
    id bigint NOT NULL,
    series_id bigint,
    occurrence_start timestamp with time zone,
    user_id bigint,
    venue_id bigint NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status NOT NULL,
    source public.booking_source DEFAULT 'online'::public.booking_source NOT NULL,
    total_cents integer NOT NULL,
    rate_snapshot jsonb NOT NULL,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    customer_name text,
    CONSTRAINT booking_cancelled_at_matches_status CHECK (((status = 'cancelled'::public.booking_status) = (cancelled_at IS NOT NULL))),
    CONSTRAINT booking_has_customer CHECK ((num_nonnulls(user_id, customer_name) >= 1)),
    CONSTRAINT booking_occurrence_requires_series CHECK (((series_id IS NULL) = (occurrence_start IS NULL))),
    CONSTRAINT booking_total_non_negative CHECK ((total_cents >= 0))
);


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id bigint NOT NULL,
    booking_id bigint,
    series_id bigint,
    kind public.payment_kind NOT NULL,
    amount_cents integer NOT NULL,
    method text NOT NULL,
    recorded_by bigint,
    external_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_amount_positive CHECK ((amount_cents > 0)),
    CONSTRAINT payment_has_one_target CHECK ((num_nonnulls(booking_id, series_id) = 1))
);


--
-- Name: BookingPaymentState; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public."BookingPaymentState" AS
 SELECT b.id AS booking_id,
    b.total_cents,
    ledger.paid_cents,
        CASE
            WHEN (ledger.paid_cents <= 0) THEN 'unpaid'::text
            WHEN (ledger.paid_cents >= b.total_cents) THEN 'paid'::text
            ELSE 'partial'::text
        END AS payment_state
   FROM (public."Booking" b
     CROSS JOIN LATERAL ( SELECT (COALESCE(sum(
                CASE
                    WHEN (p.kind = 'charge'::public.payment_kind) THEN p.amount_cents
                    ELSE (- p.amount_cents)
                END), (0)::bigint))::integer AS paid_cents
           FROM public."Payment" p
          WHERE (p.booking_id = b.id)) ledger);


--
-- Name: BookingSeries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BookingSeries" (
    id bigint NOT NULL,
    created_by bigint NOT NULL,
    rrule text NOT NULL,
    timezone text NOT NULL,
    dtstart timestamp with time zone NOT NULL,
    materialised_until timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    venue_id bigint NOT NULL,
    duration_minutes integer NOT NULL,
    source public.booking_source DEFAULT 'online'::public.booking_source NOT NULL,
    CONSTRAINT booking_series_duration_positive CHECK ((duration_minutes > 0))
);


--
-- Name: BookingSeriesCourt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BookingSeriesCourt" (
    series_id bigint NOT NULL,
    court_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: BookingSeries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."BookingSeries" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."BookingSeries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Booking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."Booking" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."Booking_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Court; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Court" (
    id bigint NOT NULL,
    venue_id bigint NOT NULL,
    name text NOT NULL,
    sport public.sport NOT NULL,
    min_duration_minutes integer DEFAULT 60 NOT NULL,
    max_duration_minutes integer DEFAULT 240 NOT NULL,
    increment_minutes integer DEFAULT 30 NOT NULL,
    buffer_minutes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    surface public.court_surface NOT NULL,
    CONSTRAINT court_buffer_non_negative CHECK ((buffer_minutes >= 0)),
    CONSTRAINT court_duration_range CHECK ((min_duration_minutes <= max_duration_minutes)),
    CONSTRAINT court_durations_positive CHECK (((min_duration_minutes > 0) AND (increment_minutes > 0)))
);


--
-- Name: Court_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."Court" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."Court_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: OpeningWindow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OpeningWindow" (
    id bigint NOT NULL,
    court_id bigint NOT NULL,
    day_of_week smallint NOT NULL,
    starts_at time without time zone NOT NULL,
    duration_minutes integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT opening_window_day_range CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT opening_window_duration_range CHECK (((duration_minutes > 0) AND (duration_minutes <= 10080)))
);


--
-- Name: OpeningWindow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."OpeningWindow" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."OpeningWindow_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."Payment" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."Payment_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: PriceRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PriceRule" (
    id bigint NOT NULL,
    court_id bigint NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    day_of_week smallint,
    starts_at time without time zone,
    ends_at time without time zone,
    member_only boolean DEFAULT false NOT NULL,
    rate_per_hour_cents integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    valid_from date,
    valid_to date,
    CONSTRAINT price_rule_day_range CHECK (((day_of_week IS NULL) OR ((day_of_week >= 0) AND (day_of_week <= 6)))),
    CONSTRAINT price_rule_rate_non_negative CHECK ((rate_per_hour_cents >= 0)),
    CONSTRAINT price_rule_valid_range CHECK (((valid_from IS NULL) OR (valid_to IS NULL) OR (valid_to >= valid_from))),
    CONSTRAINT price_rule_window_complete CHECK (((starts_at IS NULL) = (ends_at IS NULL))),
    CONSTRAINT price_rule_window_forward CHECK (((starts_at IS NULL) OR (ends_at > starts_at)))
);


--
-- Name: PriceRule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."PriceRule" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."PriceRule_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Reservation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Reservation" (
    id bigint NOT NULL,
    court_id bigint NOT NULL,
    booking_id bigint,
    kind public.reservation_kind NOT NULL,
    state public.reservation_state DEFAULT 'active'::public.reservation_state NOT NULL,
    during tstzrange NOT NULL,
    play_during tstzrange NOT NULL,
    expires_at timestamp with time zone,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reservation_booking_matches_kind CHECK ((((kind = 'blackout'::public.reservation_kind) AND (booking_id IS NULL)) OR ((kind <> 'blackout'::public.reservation_kind) AND (booking_id IS NOT NULL)))),
    CONSTRAINT reservation_during_bounded CHECK (((lower(during) IS NOT NULL) AND (upper(during) IS NOT NULL))),
    CONSTRAINT reservation_hold_has_expiry CHECK (((kind = 'hold'::public.reservation_kind) = (expires_at IS NOT NULL))),
    CONSTRAINT reservation_play_within_during CHECK ((during @> play_during)),
    CONSTRAINT reservation_reason_is_blackout_only CHECK (((kind = 'blackout'::public.reservation_kind) OR (reason IS NULL)))
);


--
-- Name: Reservation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."Reservation" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."Reservation_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id bigint NOT NULL,
    email public.citext NOT NULL,
    name text NOT NULL,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."User" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."User_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Venue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Venue" (
    id bigint NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    location public.geography(Point,4326) NOT NULL,
    timezone text NOT NULL,
    cancellation_window interval DEFAULT '24:00:00'::interval NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    description text,
    phone text,
    website text
);


--
-- Name: VenueAmenity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VenueAmenity" (
    venue_id bigint NOT NULL,
    amenity_slug text NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: VenueMember; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VenueMember" (
    venue_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role public.venue_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: VenuePhoto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VenuePhoto" (
    id bigint NOT NULL,
    venue_id bigint NOT NULL,
    court_id bigint,
    url text NOT NULL,
    alt text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT venue_photo_alt_present CHECK ((length(btrim(alt)) > 0)),
    CONSTRAINT venue_photo_url_present CHECK ((length(btrim(url)) > 0))
);


--
-- Name: VenuePhoto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."VenuePhoto" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."VenuePhoto_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Venue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."Venue" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."Venue_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: WaitlistEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WaitlistEntry" (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    venue_id bigint,
    court_id bigint,
    sport public.sport,
    desired tstzrange NOT NULL,
    min_duration_minutes integer DEFAULT 60 NOT NULL,
    state public.waitlist_state DEFAULT 'waiting'::public.waitlist_state NOT NULL,
    offered_at timestamp with time zone,
    claim_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    offered_court_id bigint,
    offered_during tstzrange,
    CONSTRAINT waitlist_entry_has_target CHECK ((num_nonnulls(venue_id, court_id) >= 1)),
    CONSTRAINT waitlist_entry_min_duration_positive CHECK ((min_duration_minutes > 0)),
    CONSTRAINT waitlist_entry_offer_is_complete CHECK (((offered_at IS NULL) = (claim_expires_at IS NULL)))
);


--
-- Name: WaitlistEntry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."WaitlistEntry" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."WaitlistEntry_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: Amenity Amenity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Amenity"
    ADD CONSTRAINT "Amenity_pkey" PRIMARY KEY (slug);


--
-- Name: BookingSeriesCourt BookingSeriesCourt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookingSeriesCourt"
    ADD CONSTRAINT "BookingSeriesCourt_pkey" PRIMARY KEY (series_id, court_id);


--
-- Name: BookingSeries BookingSeries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookingSeries"
    ADD CONSTRAINT "BookingSeries_pkey" PRIMARY KEY (id);


--
-- Name: Booking Booking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);


--
-- Name: Court Court_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Court"
    ADD CONSTRAINT "Court_pkey" PRIMARY KEY (id);


--
-- Name: OpeningWindow OpeningWindow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OpeningWindow"
    ADD CONSTRAINT "OpeningWindow_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: PriceRule PriceRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceRule"
    ADD CONSTRAINT "PriceRule_pkey" PRIMARY KEY (id);


--
-- Name: Reservation Reservation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_pkey" PRIMARY KEY (id);


--
-- Name: User User_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_email_key" UNIQUE (email);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VenueAmenity VenueAmenity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VenueAmenity"
    ADD CONSTRAINT "VenueAmenity_pkey" PRIMARY KEY (venue_id, amenity_slug);


--
-- Name: VenueMember VenueMember_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VenueMember"
    ADD CONSTRAINT "VenueMember_pkey" PRIMARY KEY (venue_id, user_id);


--
-- Name: VenuePhoto VenuePhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VenuePhoto"
    ADD CONSTRAINT "VenuePhoto_pkey" PRIMARY KEY (id);


--
-- Name: Venue Venue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Venue"
    ADD CONSTRAINT "Venue_pkey" PRIMARY KEY (id);


--
-- Name: WaitlistEntry WaitlistEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WaitlistEntry"
    ADD CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY (id);


--
-- Name: Court court_id_venue_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Court"
    ADD CONSTRAINT court_id_venue_key UNIQUE (id, venue_id);


--
-- Name: Reservation reservation_no_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT reservation_no_overlap EXCLUDE USING gist (court_id WITH =, during WITH &&) WHERE ((state = 'active'::public.reservation_state));


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: booking_series_horizon_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX booking_series_horizon_idx ON public."BookingSeries" USING btree (materialised_until);


--
-- Name: booking_series_occurrence_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX booking_series_occurrence_idx ON public."Booking" USING btree (series_id, occurrence_start) WHERE (series_id IS NOT NULL);


--
-- Name: booking_series_venue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX booking_series_venue_idx ON public."BookingSeries" USING btree (venue_id);


--
-- Name: booking_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX booking_user_idx ON public."Booking" USING btree (user_id, created_at DESC);


--
-- Name: booking_venue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX booking_venue_idx ON public."Booking" USING btree (venue_id, status, created_at DESC);


--
-- Name: court_live_venue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX court_live_venue_idx ON public."Court" USING btree (venue_id, sport) WHERE (deleted_at IS NULL);


--
-- Name: court_venue_sport_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX court_venue_sport_idx ON public."Court" USING btree (venue_id, sport);


--
-- Name: opening_window_court_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opening_window_court_idx ON public."OpeningWindow" USING btree (court_id, day_of_week);


--
-- Name: payment_booking_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_booking_idx ON public."Payment" USING btree (booking_id);


--
-- Name: payment_series_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_series_idx ON public."Payment" USING btree (series_id);


--
-- Name: price_rule_court_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_rule_court_idx ON public."PriceRule" USING btree (court_id, priority DESC, created_at DESC, id);


--
-- Name: reservation_booking_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reservation_booking_idx ON public."Reservation" USING btree (booking_id);


--
-- Name: reservation_court_during_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reservation_court_during_idx ON public."Reservation" USING gist (court_id, during);


--
-- Name: reservation_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reservation_expiry_idx ON public."Reservation" USING btree (expires_at) WHERE ((kind = 'hold'::public.reservation_kind) AND (state = 'active'::public.reservation_state));


--
-- Name: venue_amenity_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX venue_amenity_slug_idx ON public."VenueAmenity" USING btree (amenity_slug) WHERE (deleted_at IS NULL);


--
-- Name: venue_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX venue_location_idx ON public."Venue" USING gist (location) WHERE (deleted_at IS NULL);


--
-- Name: venue_member_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX venue_member_user_idx ON public."VenueMember" USING btree (user_id);


--
-- Name: venue_photo_venue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX venue_photo_venue_idx ON public."VenuePhoto" USING btree (venue_id, sort_order) WHERE (deleted_at IS NULL);


--
-- Name: waitlist_entry_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_entry_open_idx ON public."WaitlistEntry" USING gist (desired) WHERE (state = 'waiting'::public.waitlist_state);


--
-- Name: waitlist_entry_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_entry_user_idx ON public."WaitlistEntry" USING btree (user_id, state, created_at DESC);


--
-- Name: Amenity amenity_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER amenity_set_updated_at BEFORE UPDATE ON public."Amenity" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: BookingSeries booking_series_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER booking_series_set_updated_at BEFORE UPDATE ON public."BookingSeries" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: Booking booking_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER booking_set_updated_at BEFORE UPDATE ON public."Booking" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: Court court_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER court_set_updated_at BEFORE UPDATE ON public."Court" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: OpeningWindow opening_window_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER opening_window_set_updated_at BEFORE UPDATE ON public."OpeningWindow" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: Payment payment_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payment_set_updated_at BEFORE UPDATE ON public."Payment" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: PriceRule price_rule_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER price_rule_set_updated_at BEFORE UPDATE ON public."PriceRule" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: Reservation reservation_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reservation_set_updated_at BEFORE UPDATE ON public."Reservation" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: User user_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_set_updated_at BEFORE UPDATE ON public."User" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: VenueAmenity venue_amenity_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER venue_amenity_set_updated_at BEFORE UPDATE ON public."VenueAmenity" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: VenueMember venue_member_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER venue_member_set_updated_at BEFORE UPDATE ON public."VenueMember" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: VenuePhoto venue_photo_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER venue_photo_set_updated_at BEFORE UPDATE ON public."VenuePhoto" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: Venue venue_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER venue_set_updated_at BEFORE UPDATE ON public."Venue" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: WaitlistEntry waitlist_entry_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER waitlist_entry_set_updated_at BEFORE UPDATE ON public."WaitlistEntry" FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: BookingSeriesCourt BookingSeriesCourt_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookingSeriesCourt"
    ADD CONSTRAINT "BookingSeriesCourt_court_id_fkey" FOREIGN KEY (court_id) REFERENCES public."Court"(id) ON DELETE RESTRICT;


--
-- Name: BookingSeriesCourt BookingSeriesCourt_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookingSeriesCourt"
    ADD CONSTRAINT "BookingSeriesCourt_series_id_fkey" FOREIGN KEY (series_id) REFERENCES public."BookingSeries"(id) ON DELETE CASCADE;


--
-- Name: BookingSeries BookingSeries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookingSeries"
    ADD CONSTRAINT "BookingSeries_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."User"(id) ON DELETE RESTRICT;


--
-- Name: BookingSeries BookingSeries_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookingSeries"
    ADD CONSTRAINT "BookingSeries_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public."Venue"(id) ON DELETE RESTRICT;


--
-- Name: Booking Booking_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_series_id_fkey" FOREIGN KEY (series_id) REFERENCES public."BookingSeries"(id) ON DELETE SET NULL;


--
-- Name: Booking Booking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE RESTRICT;


--
-- Name: Booking Booking_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public."Venue"(id) ON DELETE RESTRICT;


--
-- Name: Court Court_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Court"
    ADD CONSTRAINT "Court_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public."Venue"(id) ON DELETE CASCADE;


--
-- Name: OpeningWindow OpeningWindow_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OpeningWindow"
    ADD CONSTRAINT "OpeningWindow_court_id_fkey" FOREIGN KEY (court_id) REFERENCES public."Court"(id) ON DELETE CASCADE;


--
-- Name: Payment Payment_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public."Booking"(id) ON DELETE RESTRICT;


--
-- Name: Payment Payment_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES public."User"(id) ON DELETE SET NULL;


--
-- Name: Payment Payment_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_series_id_fkey" FOREIGN KEY (series_id) REFERENCES public."BookingSeries"(id) ON DELETE RESTRICT;


--
-- Name: PriceRule PriceRule_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceRule"
    ADD CONSTRAINT "PriceRule_court_id_fkey" FOREIGN KEY (court_id) REFERENCES public."Court"(id) ON DELETE CASCADE;


--
-- Name: Reservation Reservation_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public."Booking"(id) ON DELETE CASCADE;


--
-- Name: Reservation Reservation_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_court_id_fkey" FOREIGN KEY (court_id) REFERENCES public."Court"(id) ON DELETE CASCADE;


--
-- Name: VenueAmenity VenueAmenity_amenity_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VenueAmenity"
    ADD CONSTRAINT "VenueAmenity_amenity_slug_fkey" FOREIGN KEY (amenity_slug) REFERENCES public."Amenity"(slug) ON DELETE RESTRICT;


--
-- Name: VenueAmenity VenueAmenity_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VenueAmenity"
    ADD CONSTRAINT "VenueAmenity_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public."Venue"(id) ON DELETE CASCADE;


--
-- Name: VenueMember VenueMember_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VenueMember"
    ADD CONSTRAINT "VenueMember_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: VenueMember VenueMember_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VenueMember"
    ADD CONSTRAINT "VenueMember_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public."Venue"(id) ON DELETE CASCADE;


--
-- Name: VenuePhoto VenuePhoto_court_id_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VenuePhoto"
    ADD CONSTRAINT "VenuePhoto_court_id_venue_id_fkey" FOREIGN KEY (court_id, venue_id) REFERENCES public."Court"(id, venue_id) ON DELETE CASCADE;


--
-- Name: VenuePhoto VenuePhoto_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VenuePhoto"
    ADD CONSTRAINT "VenuePhoto_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public."Venue"(id) ON DELETE CASCADE;


--
-- Name: WaitlistEntry WaitlistEntry_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WaitlistEntry"
    ADD CONSTRAINT "WaitlistEntry_court_id_fkey" FOREIGN KEY (court_id) REFERENCES public."Court"(id) ON DELETE CASCADE;


--
-- Name: WaitlistEntry WaitlistEntry_offered_court_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WaitlistEntry"
    ADD CONSTRAINT "WaitlistEntry_offered_court_id_fkey" FOREIGN KEY (offered_court_id) REFERENCES public."Court"(id) ON DELETE SET NULL;


--
-- Name: WaitlistEntry WaitlistEntry_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WaitlistEntry"
    ADD CONSTRAINT "WaitlistEntry_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: WaitlistEntry WaitlistEntry_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WaitlistEntry"
    ADD CONSTRAINT "WaitlistEntry_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public."Venue"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260809090100'),
    ('20260809090200'),
    ('20260809090300'),
    ('20260809090400'),
    ('20260809090500'),
    ('20260809090600'),
    ('20260809113000'),
    ('20260809160000'),
    ('20260809190000'),
    ('20260813200000'),
    ('20260815090000'),
    ('20260815090100'),
    ('20260815090200'),
    ('20260815090300'),
    ('20260815090400'),
    ('20260815100000');
