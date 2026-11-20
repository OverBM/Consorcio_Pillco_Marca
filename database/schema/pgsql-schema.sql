--
-- PostgreSQL database dump
--


-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path = public, extensions;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: fn_buscar_almacenes_con_stock(bigint, numeric, bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_buscar_almacenes_con_stock(p_material_id bigint, p_cantidad numeric, p_almacen_solicitante bigint, p_radio_m integer DEFAULT 50000) RETURNS TABLE(almacen_id bigint, obra_id bigint, disponible numeric, distancia_m numeric)
    LANGUAGE sql STABLE
    AS $$
                    SELECT a.id, a.obra_id,
                           (s.cantidad - s.cantidad_reservada) AS disponible,
                           ST_Distance(a.ubicacion, sol.ubicacion)::numeric(12,1) AS distancia_m
                    FROM almacenes a
                    JOIN almacenes sol ON sol.id = p_almacen_solicitante
                    JOIN stock_almacen s ON s.almacen_id = a.id AND s.material_id = p_material_id
                    WHERE a.activo AND a.id <> p_almacen_solicitante
                      AND (s.cantidad - s.cantidad_reservada) > 0
                      AND ST_DWithin(a.ubicacion, sol.ubicacion, p_radio_m)
                    ORDER BY ST_Distance(a.ubicacion, sol.ubicacion);
                $$;


--
-- Name: fn_dentro_geocerca(bigint, geography); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_dentro_geocerca(p_obra_id bigint, p_punto geography) RETURNS TABLE(dentro boolean, distancia_m numeric)
    LANGUAGE sql STABLE
    AS $$
                    SELECT bool_or(ST_DWithin(a.ubicacion, p_punto, a.radio_geocerca_m)),
                           MIN(ST_Distance(a.ubicacion, p_punto))::numeric(10,1)
                    FROM almacenes a WHERE a.obra_id = p_obra_id AND a.activo;
                $$;


--
-- Name: fn_kardex_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_kardex_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
                BEGIN
                    RAISE EXCEPTION 'El kardex es inmutable: registre un movimiento de ajuste';
                END;
                $$;


--
-- Name: fn_obras_con_deficit(bigint, bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_obras_con_deficit(p_material_id bigint, p_almacen_origen bigint, p_radio_m integer DEFAULT 50000) RETURNS TABLE(almacen_id bigint, obra_id bigint, deficit numeric, distancia_m numeric)
    LANGUAGE sql STABLE
    AS $$
                    SELECT a.id, a.obra_id,
                           GREATEST(s.stock_minimo - s.cantidad, 0) AS deficit,
                           ST_Distance(a.ubicacion, org.ubicacion)::numeric(12,1)
                    FROM almacenes a
                    JOIN almacenes org ON org.id = p_almacen_origen
                    JOIN obras o ON o.id = a.obra_id AND o.estado = 'ejecucion'
                    JOIN stock_almacen s ON s.almacen_id = a.id AND s.material_id = p_material_id
                    WHERE a.activo AND a.id <> p_almacen_origen
                      AND s.cantidad < s.stock_minimo
                      AND ST_DWithin(a.ubicacion, org.ubicacion, p_radio_m)
                    ORDER BY ST_Distance(a.ubicacion, org.ubicacion);
                $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adelanto_eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adelanto_eventos (
    id bigint NOT NULL,
    adelanto_id bigint NOT NULL,
    evento character varying(20) NOT NULL,
    detalle text,
    usuario_id bigint,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE adelanto_eventos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.adelanto_eventos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: adelanto_eventos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adelanto_eventos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adelanto_eventos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adelanto_eventos_id_seq OWNED BY public.adelanto_eventos.id;


--
-- Name: adelantos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adelantos (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    tipo character varying(12) NOT NULL,
    monto numeric(14,2) NOT NULL,
    estado character varying(15) DEFAULT 'solicitado'::character varying NOT NULL,
    banco_fideicomitente character varying(120),
    solicitado_por bigint NOT NULL,
    registrado_por_financiera bigint,
    garantia_fiel_cumplimiento boolean DEFAULT false NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE adelantos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.adelantos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: adelantos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adelantos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adelantos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adelantos_id_seq OWNED BY public.adelantos.id;


--
-- Name: alertas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alertas (
    id bigint NOT NULL,
    obra_id bigint,
    almacen_id bigint,
    material_id bigint,
    transferencia_id bigint,
    tipo character varying(40) NOT NULL,
    severidad character varying(8) DEFAULT 'media'::character varying NOT NULL,
    mensaje text NOT NULL,
    payload jsonb,
    clave_idempotente character varying(120),
    referencia_tipo character varying(40),
    referencia_id bigint,
    estado character varying(10) DEFAULT 'abierta'::character varying NOT NULL,
    reconocida_por bigint,
    reconocida_en timestamp(0) with time zone,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_alertas_estado CHECK (((estado)::text = ANY ((ARRAY['abierta'::character varying, 'reconocida'::character varying, 'resuelta'::character varying, 'vigente'::character varying])::text[]))),
    CONSTRAINT chk_alertas_severidad CHECK (((severidad)::text = ANY ((ARRAY['baja'::character varying, 'media'::character varying, 'alta'::character varying, 'critica'::character varying])::text[])))
);


--
-- Name: TABLE alertas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.alertas IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN alertas.severidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.alertas.severidad IS 'Valores permitidos: baja, media, alta, critica';


--
-- Name: COLUMN alertas.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.alertas.estado IS 'Valores permitidos: abierta, reconocida, resuelta, vigente';


--
-- Name: alertas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alertas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alertas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alertas_id_seq OWNED BY public.alertas.id;


--
-- Name: almacenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.almacenes (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(160) NOT NULL,
    radio_geocerca_m integer DEFAULT 150 NOT NULL,
    capacidad_referencial numeric(12,2),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone,
    ubicacion geography(Point,4326) NOT NULL,
    latitud numeric(10,7),
    longitud numeric(10,7)
);


--
-- Name: TABLE almacenes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.almacenes IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: almacenes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.almacenes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: almacenes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.almacenes_id_seq OWNED BY public.almacenes.id;


--
-- Name: asistencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asistencias (
    id bigint NOT NULL,
    trabajador_id bigint NOT NULL,
    obra_id bigint NOT NULL,
    fecha date NOT NULL,
    horas_trabajadas numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    inconsistencia character varying(25),
    estado character varying(15) DEFAULT 'consolidada'::character varying NOT NULL,
    corregida_por bigint,
    aprobada_por bigint,
    motivo_correccion text,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_asistencias_estado CHECK (((estado)::text = ANY ((ARRAY['consolidada'::character varying, 'observada'::character varying])::text[])))
);


--
-- Name: TABLE asistencias; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.asistencias IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN asistencias.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.asistencias.estado IS 'Valores permitidos: consolidada, observada';


--
-- Name: asistencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asistencias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asistencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asistencias_id_seq OWNED BY public.asistencias.id;


--
-- Name: auditorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditorias (
    id bigint NOT NULL,
    usuario_id bigint,
    accion character varying(60) NOT NULL,
    entidad character varying(80) NOT NULL,
    entidad_id bigint,
    antes jsonb,
    despues jsonb,
    ip inet,
    user_agent text,
    hash_anterior character(64),
    hash_registro character(64),
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
)
WITH (autovacuum_vacuum_scale_factor='0.05', autovacuum_analyze_scale_factor='0.02');


--
-- Name: TABLE auditorias; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auditorias IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: auditorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditorias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditorias_id_seq OWNED BY public.auditorias.id;


--
-- Name: avances_fisicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avances_fisicos (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    frente_id bigint,
    partida_id bigint NOT NULL,
    periodo date NOT NULL,
    metrado_ejecutado numeric(14,3) NOT NULL,
    avance_pct_acumulado numeric(5,2) NOT NULL,
    registrado_por bigint NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE avances_fisicos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.avances_fisicos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: avances_fisicos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.avances_fisicos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: avances_fisicos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.avances_fisicos_id_seq OWNED BY public.avances_fisicos.id;


--
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration bigint NOT NULL
);


--
-- Name: TABLE cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cache IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration bigint NOT NULL
);


--
-- Name: TABLE cache_locks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cache_locks IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: capacitaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capacitaciones (
    id bigint NOT NULL,
    tipo character varying(15) NOT NULL,
    titulo character varying(200) NOT NULL,
    obra_id bigint,
    fecha_programada timestamp(0) with time zone NOT NULL,
    instructor character varying(120),
    nota_minima numeric(4,1) DEFAULT '11'::numeric NOT NULL,
    vigencia_meses smallint,
    programada_por bigint NOT NULL,
    estado character varying(12) DEFAULT 'programada'::character varying NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_capacitaciones_estado CHECK (((estado)::text = ANY ((ARRAY['programada'::character varying, 'completada'::character varying, 'cancelada'::character varying, 'ejecutada'::character varying])::text[])))
);


--
-- Name: TABLE capacitaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.capacitaciones IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN capacitaciones.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.capacitaciones.estado IS 'Valores permitidos: programada, completada, cancelada, ejecutada';


--
-- Name: capacitaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.capacitaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: capacitaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.capacitaciones_id_seq OWNED BY public.capacitaciones.id;


--
-- Name: categorias_material; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_material (
    id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE categorias_material; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.categorias_material IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: categorias_material_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_material_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_material_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_material_id_seq OWNED BY public.categorias_material.id;


--
-- Name: cotizacion_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotizacion_detalles (
    id bigint NOT NULL,
    cotizacion_id bigint NOT NULL,
    material_id bigint NOT NULL,
    cantidad numeric(14,3) NOT NULL,
    precio_unitario numeric(14,4) NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE cotizacion_detalles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cotizacion_detalles IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: cotizacion_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cotizacion_detalles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cotizacion_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cotizacion_detalles_id_seq OWNED BY public.cotizacion_detalles.id;


--
-- Name: cotizaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotizaciones (
    id bigint NOT NULL,
    solicitud_id bigint NOT NULL,
    proveedor_id bigint NOT NULL,
    total numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    plazo_entrega_dias smallint,
    condiciones text,
    estado character varying(12) DEFAULT 'recibida'::character varying NOT NULL,
    motivo_seleccion text,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_cotizaciones_estado CHECK (((estado)::text = ANY ((ARRAY['recibida'::character varying, 'seleccionada'::character varying, 'rechazada'::character varying])::text[])))
);


--
-- Name: TABLE cotizaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cotizaciones IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN cotizaciones.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cotizaciones.estado IS 'Valores permitidos: recibida, seleccionada, rechazada';


--
-- Name: cotizaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cotizaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cotizaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cotizaciones_id_seq OWNED BY public.cotizaciones.id;


--
-- Name: devolucion_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devolucion_detalles (
    id bigint NOT NULL,
    devolucion_id bigint NOT NULL,
    material_id bigint NOT NULL,
    lote_id bigint,
    cantidad numeric(14,3) NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE devolucion_detalles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.devolucion_detalles IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: devolucion_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devolucion_detalles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devolucion_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devolucion_detalles_id_seq OWNED BY public.devolucion_detalles.id;


--
-- Name: devoluciones_proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devoluciones_proveedor (
    id bigint NOT NULL,
    codigo character varying(30) NOT NULL,
    recepcion_id bigint NOT NULL,
    proveedor_id bigint NOT NULL,
    motivo text NOT NULL,
    estado character varying(15) DEFAULT 'registrada'::character varying NOT NULL,
    registrada_por bigint NOT NULL,
    aprobada_por bigint,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE devoluciones_proveedor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.devoluciones_proveedor IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: devoluciones_proveedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devoluciones_proveedor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devoluciones_proveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devoluciones_proveedor_id_seq OWNED BY public.devoluciones_proveedor.id;


--
-- Name: documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos (
    id bigint NOT NULL,
    obra_id bigint,
    tipo character varying(30) NOT NULL,
    titulo character varying(200) NOT NULL,
    ruta character varying(255) NOT NULL,
    hash_sha256 character(64),
    version smallint DEFAULT '1'::smallint NOT NULL,
    documentable_type character varying(120),
    documentable_id bigint,
    etapa character varying(40),
    subido_por bigint NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone
);


--
-- Name: TABLE documentos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.documentos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: documentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documentos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documentos_id_seq OWNED BY public.documentos.id;


--
-- Name: ejecuciones_analitica; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ejecuciones_analitica (
    id bigint NOT NULL,
    origen character varying(15) DEFAULT 'manual'::character varying NOT NULL,
    estado character varying(20) DEFAULT 'en_proceso'::character varying NOT NULL,
    inicio timestamp(0) with time zone NOT NULL,
    fin timestamp(0) with time zone,
    duracion_ms integer,
    series integer DEFAULT 0 NOT NULL,
    calculadas integer DEFAULT 0 NOT NULL,
    alertas integer DEFAULT 0 NOT NULL,
    errores integer DEFAULT 0 NOT NULL,
    mensaje text,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_ejecuciones_analitica_estado CHECK (((estado)::text = ANY ((ARRAY['en_proceso'::character varying, 'completada'::character varying, 'fallida'::character varying])::text[])))
);


--
-- Name: TABLE ejecuciones_analitica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ejecuciones_analitica IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN ejecuciones_analitica.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ejecuciones_analitica.estado IS 'Valores permitidos: en_proceso, completada, fallida';


--
-- Name: ejecuciones_analitica_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ejecuciones_analitica_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ejecuciones_analitica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ejecuciones_analitica_id_seq OWNED BY public.ejecuciones_analitica.id;


--
-- Name: epp_asignaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epp_asignaciones (
    id bigint NOT NULL,
    trabajador_id bigint NOT NULL,
    material_id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    numero_serie character varying(60),
    entregado_por bigint NOT NULL,
    entregado_en timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado character varying(12) DEFAULT 'vigente'::character varying NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_epp_asignaciones_estado CHECK (((estado)::text = ANY ((ARRAY['vigente'::character varying, 'devuelto'::character varying])::text[])))
);


--
-- Name: TABLE epp_asignaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.epp_asignaciones IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN epp_asignaciones.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.epp_asignaciones.estado IS 'Valores permitidos: vigente, devuelto';


--
-- Name: epp_asignaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.epp_asignaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: epp_asignaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.epp_asignaciones_id_seq OWNED BY public.epp_asignaciones.id;


--
-- Name: excedentes_detectados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.excedentes_detectados (
    id bigint NOT NULL,
    obra_origen_id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    material_id bigint NOT NULL,
    cantidad numeric(14,3) NOT NULL,
    origen character varying(20) DEFAULT 'cierre_obra'::character varying NOT NULL,
    estado character varying(15) DEFAULT 'detectado'::character varying NOT NULL,
    detectado_en timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_excedentes_detectados_estado CHECK (((estado)::text = ANY ((ARRAY['detectado'::character varying, 'sugerido'::character varying, 'redistribuido'::character varying, 'descartado'::character varying])::text[])))
);


--
-- Name: TABLE excedentes_detectados; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.excedentes_detectados IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN excedentes_detectados.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.excedentes_detectados.estado IS 'Valores permitidos: detectado, sugerido, redistribuido, descartado';


--
-- Name: excedentes_detectados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.excedentes_detectados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: excedentes_detectados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.excedentes_detectados_id_seq OWNED BY public.excedentes_detectados.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection character varying(255) NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE failed_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.failed_jobs IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: fase_criterios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fase_criterios (
    id bigint NOT NULL,
    fase character varying(24) NOT NULL,
    codigo character varying(60) NOT NULL,
    nombre character varying(160) NOT NULL,
    tipo character varying(40) NOT NULL,
    parametros json,
    umbral numeric(14,3),
    obligatorio boolean DEFAULT true NOT NULL,
    orden smallint DEFAULT '0'::smallint NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE fase_criterios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fase_criterios IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: fase_criterios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fase_criterios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fase_criterios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fase_criterios_id_seq OWNED BY public.fase_criterios.id;


--
-- Name: fase_requisitos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fase_requisitos (
    id bigint NOT NULL,
    fase character varying(24) NOT NULL,
    codigo character varying(60) NOT NULL,
    nombre character varying(160) NOT NULL,
    descripcion text,
    orden smallint DEFAULT '0'::smallint NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE fase_requisitos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fase_requisitos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: fase_requisitos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fase_requisitos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fase_requisitos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fase_requisitos_id_seq OWNED BY public.fase_requisitos.id;


--
-- Name: frentes_trabajo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frentes_trabajo (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    nombre character varying(160) NOT NULL,
    maestro_obra_id bigint,
    estado character varying(15) DEFAULT 'activo'::character varying NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_frentes_trabajo_estado CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying])::text[])))
);


--
-- Name: TABLE frentes_trabajo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.frentes_trabajo IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN frentes_trabajo.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.frentes_trabajo.estado IS 'Valores permitidos: activo, inactivo';


--
-- Name: frentes_trabajo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.frentes_trabajo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: frentes_trabajo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.frentes_trabajo_id_seq OWNED BY public.frentes_trabajo.id;


--
-- Name: hitos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hitos (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    nombre character varying(160) NOT NULL,
    fecha_planificada date NOT NULL,
    fecha_real date,
    estado character varying(12) DEFAULT 'pendiente'::character varying NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE hitos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hitos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: hitos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hitos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hitos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hitos_id_seq OWNED BY public.hitos.id;


--
-- Name: incidentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidentes (
    id bigint NOT NULL,
    codigo character varying(30) NOT NULL,
    obra_id bigint NOT NULL,
    trabajador_id bigint,
    reportado_por bigint NOT NULL,
    tipo character varying(30) NOT NULL,
    gravedad character varying(10) NOT NULL,
    ocurrido_en timestamp(0) with time zone NOT NULL,
    descripcion text NOT NULL,
    requiere_traslado boolean DEFAULT false NOT NULL,
    estado character varying(15) DEFAULT 'reportado'::character varying NOT NULL,
    causas text,
    reporte_tecnico_id bigint,
    validado_por bigint,
    remitido_en timestamp(0) with time zone,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    ubicacion geography(Point,4326),
    CONSTRAINT chk_incidentes_estado CHECK (((estado)::text = ANY ((ARRAY['reportado'::character varying, 'investigado'::character varying, 'cerrado'::character varying])::text[])))
);


--
-- Name: TABLE incidentes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.incidentes IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN incidentes.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.incidentes.estado IS 'Valores permitidos: reportado, investigado, cerrado';


--
-- Name: incidentes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.incidentes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: incidentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.incidentes_id_seq OWNED BY public.incidentes.id;


--
-- Name: indicadores_ambientales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indicadores_ambientales (
    id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(80) NOT NULL,
    unidad character varying(20) NOT NULL,
    limite_maximo numeric(12,3) NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE indicadores_ambientales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.indicadores_ambientales IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: indicadores_ambientales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.indicadores_ambientales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: indicadores_ambientales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.indicadores_ambientales_id_seq OWNED BY public.indicadores_ambientales.id;


--
-- Name: inventario_fisico_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_fisico_detalles (
    id bigint NOT NULL,
    inventario_id bigint NOT NULL,
    material_id bigint NOT NULL,
    cantidad_sistema numeric(14,3) NOT NULL,
    cantidad_contada numeric(14,3),
    cantidad_reconteo numeric(14,3),
    justificacion text,
    justificacion_revisada_por bigint,
    ajuste_aprobado boolean,
    ajuste_aprobado_por bigint,
    diferencia numeric(14,3) GENERATED ALWAYS AS ((COALESCE(cantidad_reconteo, cantidad_contada) - cantidad_sistema)) STORED,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE inventario_fisico_detalles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inventario_fisico_detalles IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: inventario_fisico_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_fisico_detalles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_fisico_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_fisico_detalles_id_seq OWNED BY public.inventario_fisico_detalles.id;


--
-- Name: inventarios_fisicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventarios_fisicos (
    id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    periodo character varying(20) NOT NULL,
    estado character varying(15) DEFAULT 'programado'::character varying NOT NULL,
    ciego boolean DEFAULT true NOT NULL,
    tolerancia_pct numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    programado_por bigint NOT NULL,
    cerrado_por bigint,
    cerrado_en timestamp(0) with time zone,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_inventarios_fisicos_estado CHECK (((estado)::text = ANY ((ARRAY['programado'::character varying, 'en_conteo'::character varying, 'en_proceso'::character varying, 'cerrado'::character varying])::text[])))
);


--
-- Name: TABLE inventarios_fisicos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inventarios_fisicos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN inventarios_fisicos.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventarios_fisicos.estado IS 'Valores permitidos: programado, en_conteo, en_proceso, cerrado';


--
-- Name: inventarios_fisicos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventarios_fisicos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventarios_fisicos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventarios_fisicos_id_seq OWNED BY public.inventarios_fisicos.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


--
-- Name: TABLE job_batches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.job_batches IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


--
-- Name: TABLE jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.jobs IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: kardex; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kardex (
    id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    material_id bigint NOT NULL,
    lote_id bigint,
    tipo_movimiento character varying(30) NOT NULL,
    cantidad numeric(14,3) NOT NULL,
    saldo_resultante numeric(14,3) NOT NULL,
    costo_unitario numeric(14,4),
    documento_tipo character varying(40),
    documento_id bigint,
    usuario_id bigint,
    observacion text,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
)
WITH (autovacuum_vacuum_scale_factor='0.05', autovacuum_analyze_scale_factor='0.02');


--
-- Name: TABLE kardex; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kardex IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: kardex_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kardex_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kardex_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kardex_id_seq OWNED BY public.kardex.id;


--
-- Name: lineas_base_costo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lineas_base_costo (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    version smallint NOT NULL,
    bac numeric(14,2) NOT NULL,
    vigente boolean DEFAULT true NOT NULL,
    aprobada_por bigint,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE lineas_base_costo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lineas_base_costo IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: lineas_base_costo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lineas_base_costo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lineas_base_costo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lineas_base_costo_id_seq OWNED BY public.lineas_base_costo.id;


--
-- Name: lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lotes (
    id bigint NOT NULL,
    material_id bigint NOT NULL,
    codigo_lote character varying(60) NOT NULL,
    proveedor_id bigint,
    fecha_vencimiento date,
    estado character varying(12) DEFAULT 'cuarentena'::character varying NOT NULL,
    codigo_qr character varying(120),
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_lotes_estado CHECK (((estado)::text = ANY ((ARRAY['cuarentena'::character varying, 'disponible'::character varying, 'vencido'::character varying])::text[])))
);


--
-- Name: TABLE lotes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lotes IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN lotes.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lotes.estado IS 'Valores permitidos: cuarentena, disponible, vencido';


--
-- Name: lotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lotes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lotes_id_seq OWNED BY public.lotes.id;


--
-- Name: marcaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marcaciones (
    id bigint NOT NULL,
    trabajador_id bigint NOT NULL,
    obra_id bigint NOT NULL,
    tipo character varying(8) NOT NULL,
    marcado_en timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    distancia_a_obra_m numeric(10,1),
    dentro_geocerca boolean,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ubicacion geography(Point,4326),
    uuid uuid,
    latitud numeric(10,7),
    longitud numeric(10,7),
    CONSTRAINT chk_marcaciones_tipo CHECK (((tipo)::text = ANY ((ARRAY['entrada'::character varying, 'salida'::character varying])::text[])))
);


--
-- Name: TABLE marcaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.marcaciones IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN marcaciones.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marcaciones.tipo IS 'Valores permitidos: entrada, salida';


--
-- Name: marcaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marcaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marcaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marcaciones_id_seq OWNED BY public.marcaciones.id;


--
-- Name: material_proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_proveedor (
    id bigint NOT NULL,
    material_id bigint NOT NULL,
    proveedor_id bigint NOT NULL,
    lead_time_dias numeric(8,2) NOT NULL,
    costo_pedido numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    precio_unitario numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    es_principal boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone
);


--
-- Name: TABLE material_proveedor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.material_proveedor IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: material_proveedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.material_proveedor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: material_proveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.material_proveedor_id_seq OWNED BY public.material_proveedor.id;


--
-- Name: materiales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materiales (
    id bigint NOT NULL,
    codigo character varying(40) NOT NULL,
    nombre character varying(200) NOT NULL,
    categoria_id bigint NOT NULL,
    unidad_id bigint NOT NULL,
    criticidad character varying(10) DEFAULT 'normal'::character varying NOT NULL,
    es_epp boolean DEFAULT false NOT NULL,
    requiere_serie boolean DEFAULT false NOT NULL,
    requiere_lote boolean DEFAULT false NOT NULL,
    costo_referencial numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    especificaciones jsonb DEFAULT '{}'::jsonb NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone,
    CONSTRAINT chk_materiales_criticidad CHECK (((criticidad)::text = ANY ((ARRAY['baja'::character varying, 'normal'::character varying, 'alta'::character varying, 'critica'::character varying])::text[])))
);


--
-- Name: TABLE materiales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.materiales IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN materiales.criticidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.materiales.criticidad IS 'Valores permitidos: baja, normal, alta, critica';


--
-- Name: materiales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materiales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materiales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materiales_id_seq OWNED BY public.materiales.id;


--
-- Name: mediciones_ambientales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mediciones_ambientales (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    indicador_id bigint NOT NULL,
    valor numeric(12,3) NOT NULL,
    fuera_de_limite boolean NOT NULL,
    medida_correctiva text,
    medida_aplicada_por bigint,
    medido_por bigint NOT NULL,
    medido_en timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE mediciones_ambientales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mediciones_ambientales IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: mediciones_ambientales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mediciones_ambientales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mediciones_ambientales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mediciones_ambientales_id_seq OWNED BY public.mediciones_ambientales.id;


--
-- Name: mermas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mermas (
    id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    material_id bigint NOT NULL,
    lote_id bigint,
    transferencia_id bigint,
    cantidad numeric(14,3) NOT NULL,
    causa character varying(25) NOT NULL,
    justificacion text NOT NULL,
    estado character varying(12) DEFAULT 'registrada'::character varying NOT NULL,
    registrada_por bigint NOT NULL,
    aprobada_por bigint,
    aprobada_en timestamp(0) with time zone,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_mermas_estado CHECK (((estado)::text = ANY ((ARRAY['registrada'::character varying, 'aprobada'::character varying, 'rechazada'::character varying])::text[])))
);


--
-- Name: TABLE mermas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mermas IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN mermas.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mermas.estado IS 'Valores permitidos: registrada, aprobada, rechazada';


--
-- Name: mermas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mermas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mermas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mermas_id_seq OWNED BY public.mermas.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


--
-- Name: TABLE migrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.migrations IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificaciones (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    alerta_id bigint,
    tipo character varying(40) NOT NULL,
    titulo character varying(160) NOT NULL,
    cuerpo text,
    referencia_tipo character varying(40),
    referencia_id bigint,
    leida_en timestamp(0) with time zone,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE notificaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notificaciones IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notificaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notificaciones_id_seq OWNED BY public.notificaciones.id;


--
-- Name: obra_fases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.obra_fases (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    fase character varying(24) NOT NULL,
    estado character varying(12) DEFAULT 'pendiente'::character varying NOT NULL,
    aprobada_por bigint,
    aprobada_en timestamp(0) with time zone,
    observaciones text,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_obra_fases_estado CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_proceso'::character varying, 'aprobada'::character varying, 'rechazada'::character varying])::text[])))
);


--
-- Name: TABLE obra_fases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.obra_fases IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN obra_fases.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obra_fases.estado IS 'Valores permitidos: pendiente, en_proceso, aprobada, rechazada';


--
-- Name: obra_fases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.obra_fases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: obra_fases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.obra_fases_id_seq OWNED BY public.obra_fases.id;


--
-- Name: obras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.obras (
    id bigint NOT NULL,
    programa_id bigint NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(200) NOT NULL,
    direccion character varying(240),
    distrito character varying(80),
    estado character varying(20) DEFAULT 'planificacion'::character varying NOT NULL,
    fase_ciclo character varying(24) DEFAULT 'inicio'::character varying NOT NULL,
    fecha_inicio date,
    fecha_fin_prevista date,
    fecha_fin_real date,
    avance_fisico_pct numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    presupuesto_base numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    residente_id bigint,
    informe_final_id bigint,
    acta_recepcion_id bigint,
    cerrado_por bigint,
    cerrado_en timestamp(0) with time zone,
    observaciones_cierre text,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone,
    ubicacion geography(Point,4326) NOT NULL,
    latitud numeric(10,7),
    longitud numeric(10,7),
    CONSTRAINT chk_obras_estado CHECK (((estado)::text = ANY ((ARRAY['planificacion'::character varying, 'ejecucion'::character varying, 'cierre'::character varying, 'liquidada'::character varying, 'cerrada'::character varying])::text[])))
);


--
-- Name: TABLE obras; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.obras IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN obras.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.estado IS 'Valores permitidos: planificacion, ejecucion, cierre, liquidada, cerrada';


--
-- Name: obras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.obras_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: obras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.obras_id_seq OWNED BY public.obras.id;


--
-- Name: observaciones_tecnicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.observaciones_tecnicas (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    numero_acta character varying(40),
    descripcion text NOT NULL,
    origen character varying(12) DEFAULT 'supervision'::character varying NOT NULL,
    plazo_subsanacion date,
    responsable_id bigint,
    estado character varying(15) DEFAULT 'notificada'::character varying NOT NULL,
    acta_levantamiento_id bigint,
    planos_asbuilt_actualizados boolean DEFAULT false NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_observaciones_tecnicas_estado CHECK (((estado)::text = ANY ((ARRAY['notificada'::character varying, 'levantada'::character varying, 'cerrada'::character varying])::text[])))
);


--
-- Name: TABLE observaciones_tecnicas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.observaciones_tecnicas IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN observaciones_tecnicas.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.observaciones_tecnicas.estado IS 'Valores permitidos: notificada, levantada, cerrada';


--
-- Name: observaciones_tecnicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.observaciones_tecnicas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: observaciones_tecnicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.observaciones_tecnicas_id_seq OWNED BY public.observaciones_tecnicas.id;


--
-- Name: orden_compra_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orden_compra_detalles (
    id bigint NOT NULL,
    orden_compra_id bigint NOT NULL,
    material_id bigint NOT NULL,
    cantidad numeric(14,3) NOT NULL,
    precio_unitario numeric(14,4) NOT NULL,
    especificaciones_tecnicas jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE orden_compra_detalles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orden_compra_detalles IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: orden_compra_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orden_compra_detalles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orden_compra_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orden_compra_detalles_id_seq OWNED BY public.orden_compra_detalles.id;


--
-- Name: ordenes_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ordenes_compra (
    id bigint NOT NULL,
    codigo character varying(30) NOT NULL,
    solicitud_id bigint,
    cotizacion_id bigint,
    proveedor_id bigint NOT NULL,
    obra_id bigint NOT NULL,
    almacen_destino_id bigint NOT NULL,
    urgente boolean DEFAULT false NOT NULL,
    estado character varying(20) DEFAULT 'emitida'::character varying NOT NULL,
    total numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    emitida_por bigint NOT NULL,
    fecha_entrega_prometida date,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone,
    CONSTRAINT chk_ordenes_compra_estado CHECK (((estado)::text = ANY ((ARRAY['emitida'::character varying, 'confirmada_proveedor'::character varying, 'en_transporte'::character varying, 'recepcionada_total'::character varying, 'recepcionada_parcial'::character varying, 'anulada'::character varying, 'recibida'::character varying, 'parcial'::character varying])::text[])))
);


--
-- Name: TABLE ordenes_compra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ordenes_compra IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN ordenes_compra.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ordenes_compra.estado IS 'Valores permitidos: emitida, confirmada_proveedor, en_transporte, recepcionada_total, recepcionada_parcial, anulada, recibida, parcial';


--
-- Name: ordenes_compra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ordenes_compra_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ordenes_compra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ordenes_compra_id_seq OWNED BY public.ordenes_compra.id;


--
-- Name: parametros_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parametros_inventario (
    id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    material_id bigint NOT NULL,
    eoq numeric(14,3),
    stock_seguridad_calculado numeric(14,3),
    punto_reorden_calculado numeric(14,3),
    costo_total_relevante numeric(14,3),
    demanda_media_diaria numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    demanda_anual numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    lead_time_dias numeric(8,2),
    nivel_servicio numeric(5,4) DEFAULT 0.95 NOT NULL,
    clase_abc character varying(12) DEFAULT 'C'::character varying NOT NULL,
    clase_xyz character varying(1) DEFAULT 'X'::character varying NOT NULL,
    clase_combinada character varying(13) DEFAULT 'CX'::character varying NOT NULL,
    coeficiente_variacion numeric(10,6) DEFAULT '0'::numeric NOT NULL,
    estado character varying(30) DEFAULT 'calculado'::character varying NOT NULL,
    modelo_version character varying(40) NOT NULL,
    origen character varying(15) DEFAULT 'programado'::character varying NOT NULL,
    vigente boolean DEFAULT true NOT NULL,
    payload jsonb,
    calculado_en timestamp(0) with time zone NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_parametros_inventario_estado CHECK (((estado)::text = ANY ((ARRAY['calculado'::character varying, 'sin_demanda'::character varying, 'parametros_incompletos'::character varying])::text[])))
);


--
-- Name: TABLE parametros_inventario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.parametros_inventario IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN parametros_inventario.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.parametros_inventario.estado IS 'Valores permitidos: calculado, sin_demanda, parametros_incompletos';


--
-- Name: parametros_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parametros_inventario_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parametros_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parametros_inventario_id_seq OWNED BY public.parametros_inventario.id;


--
-- Name: parametros_sistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parametros_sistema (
    id bigint NOT NULL,
    clave character varying(80) NOT NULL,
    valor text NOT NULL,
    tipo character varying(20) DEFAULT 'texto'::character varying NOT NULL,
    descripcion text,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_parametros_sistema_tipo CHECK (((tipo)::text = ANY ((ARRAY['texto'::character varying, 'numero'::character varying, 'booleano'::character varying])::text[])))
);


--
-- Name: TABLE parametros_sistema; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.parametros_sistema IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN parametros_sistema.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.parametros_sistema.tipo IS 'Valores permitidos: texto, numero, booleano';


--
-- Name: parametros_sistema_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parametros_sistema_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parametros_sistema_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parametros_sistema_id_seq OWNED BY public.parametros_sistema.id;


--
-- Name: partidas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partidas (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    frente_id bigint,
    codigo character varying(30) NOT NULL,
    descripcion character varying(240) NOT NULL,
    unidad character varying(15) NOT NULL,
    metrado numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    costo_unitario numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    avance_pct numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    fecha_inicio_prevista date,
    fecha_fin_prevista date,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE partidas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.partidas IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: partidas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partidas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partidas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partidas_id_seq OWNED BY public.partidas.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) with time zone
);


--
-- Name: TABLE password_reset_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.password_reset_tokens IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: permiso_rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permiso_rol (
    rol_id bigint NOT NULL,
    permiso_id bigint NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE permiso_rol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.permiso_rol IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permisos (
    id bigint NOT NULL,
    codigo character varying(80) NOT NULL,
    modulo character varying(60) NOT NULL,
    descripcion text,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE permisos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.permisos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: permisos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permisos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permisos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permisos_id_seq OWNED BY public.permisos.id;


--
-- Name: personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personas (
    id bigint NOT NULL,
    dni character varying(12),
    nombres character varying(150) NOT NULL,
    telefono character varying(30),
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone
);


--
-- Name: TABLE personas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.personas IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: personas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personas_id_seq OWNED BY public.personas.id;


--
-- Name: planilla_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planilla_detalles (
    id bigint NOT NULL,
    planilla_id bigint NOT NULL,
    trabajador_id bigint NOT NULL,
    dias_laborados smallint NOT NULL,
    horas_totales numeric(7,2) NOT NULL,
    monto numeric(12,2) NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE planilla_detalles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.planilla_detalles IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: planilla_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planilla_detalles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planilla_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planilla_detalles_id_seq OWNED BY public.planilla_detalles.id;


--
-- Name: planillas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planillas (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    periodo character varying(20) NOT NULL,
    estado character varying(12) DEFAULT 'abierta'::character varying NOT NULL,
    total numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    procesada_por bigint,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_planillas_estado CHECK (((estado)::text = ANY ((ARRAY['abierta'::character varying, 'procesada'::character varying, 'pagada'::character varying, 'cerrada'::character varying])::text[])))
);


--
-- Name: TABLE planillas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.planillas IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN planillas.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.planillas.estado IS 'Valores permitidos: abierta, procesada, pagada, cerrada';


--
-- Name: planillas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planillas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planillas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planillas_id_seq OWNED BY public.planillas.id;


--
-- Name: programas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programas (
    id bigint NOT NULL,
    nombre character varying(160) NOT NULL,
    descripcion text,
    entidad_contratante character varying(160),
    estado character varying(20) DEFAULT 'activa'::character varying NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone,
    CONSTRAINT chk_programas_estado CHECK (((estado)::text = ANY ((ARRAY['activa'::character varying, 'ejecucion'::character varying, 'cierre'::character varying, 'liquidada'::character varying, 'activo'::character varying])::text[])))
);


--
-- Name: TABLE programas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.programas IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN programas.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.programas.estado IS 'Valores permitidos: activa, ejecucion, cierre, liquidada, activo';


--
-- Name: programas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programas_id_seq OWNED BY public.programas.id;


--
-- Name: pronosticos_demanda; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pronosticos_demanda (
    id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    material_id bigint NOT NULL,
    fecha date NOT NULL,
    cantidad numeric(14,3) NOT NULL,
    limite_inferior numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    limite_superior numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    mape numeric(8,3),
    rmse numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    metodo_usado character varying(40) NOT NULL,
    baja_confianza boolean DEFAULT false NOT NULL,
    modelo_version character varying(40) NOT NULL,
    calculado_en timestamp(0) with time zone NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
)
WITH (autovacuum_vacuum_scale_factor='0.05', autovacuum_analyze_scale_factor='0.02');


--
-- Name: TABLE pronosticos_demanda; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pronosticos_demanda IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: pronosticos_demanda_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pronosticos_demanda_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pronosticos_demanda_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pronosticos_demanda_id_seq OWNED BY public.pronosticos_demanda.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id bigint NOT NULL,
    ruc character varying(11) NOT NULL,
    razon_social character varying(200) NOT NULL,
    contacto character varying(120),
    telefono character varying(30),
    email character varying(160),
    direccion character varying(240),
    tipo character varying(20) DEFAULT 'material'::character varying NOT NULL,
    autorizacion character varying(80),
    vigente_hasta date,
    calificacion numeric(3,2),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone
);


--
-- Name: TABLE proveedores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proveedores IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: recepcion_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recepcion_detalles (
    id bigint NOT NULL,
    recepcion_id bigint NOT NULL,
    orden_compra_detalle_id bigint NOT NULL,
    material_id bigint NOT NULL,
    lote_id bigint,
    ubicacion_id bigint,
    cantidad_ordenada numeric(14,3) NOT NULL,
    cantidad_recibida numeric(14,3) NOT NULL,
    cumple_especificaciones boolean,
    detalle_validacion jsonb,
    motivo_rechazo text,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE recepcion_detalles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recepcion_detalles IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: recepcion_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recepcion_detalles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recepcion_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recepcion_detalles_id_seq OWNED BY public.recepcion_detalles.id;


--
-- Name: recepciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recepciones (
    id bigint NOT NULL,
    codigo character varying(30) NOT NULL,
    almacen_id bigint NOT NULL,
    orden_compra_id bigint NOT NULL,
    almacenero_id bigint NOT NULL,
    guia_remision character varying(40),
    estado character varying(15) DEFAULT 'en_verificacion'::character varying NOT NULL,
    recibida_en timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    firma_ruta character varying(255),
    foto_ruta character varying(255),
    observaciones text,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    ubicacion_recepcion geography(Point,4326)
);


--
-- Name: TABLE recepciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.recepciones IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: recepciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recepciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recepciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recepciones_id_seq OWNED BY public.recepciones.id;


--
-- Name: residuos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.residuos (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    clase character varying(12) NOT NULL,
    descripcion character varying(200) NOT NULL,
    material_id bigint,
    volumen numeric(12,3) NOT NULL,
    unidad character varying(10) NOT NULL,
    registrado_por bigint NOT NULL,
    destino character varying(30),
    transferencia_id bigint,
    proveedor_id bigint,
    manifiesto_id bigint,
    estado character varying(20) DEFAULT 'registrado'::character varying NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_residuos_clase CHECK (((clase)::text = ANY ((ARRAY['no_peligroso'::character varying, 'peligroso'::character varying, 'reutilizable'::character varying])::text[]))),
    CONSTRAINT chk_residuos_destino CHECK (((destino)::text = ANY ((ARRAY['eors'::character varying, 'reaprovechamiento'::character varying, 'reciclaje'::character varying, 'relleno'::character varying])::text[]))),
    CONSTRAINT chk_residuos_estado CHECK (((estado)::text = ANY ((ARRAY['registrado'::character varying, 'entregado'::character varying, 'reaprovechado'::character varying])::text[])))
);


--
-- Name: TABLE residuos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.residuos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN residuos.clase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.residuos.clase IS 'Valores permitidos: no_peligroso, peligroso, reutilizable';


--
-- Name: COLUMN residuos.destino; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.residuos.destino IS 'Valores permitidos: eors, reaprovechamiento, reciclaje, relleno';


--
-- Name: COLUMN residuos.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.residuos.estado IS 'Valores permitidos: registrado, entregado, reaprovechado';


--
-- Name: residuos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.residuos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: residuos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.residuos_id_seq OWNED BY public.residuos.id;


--
-- Name: riesgos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.riesgos (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    descripcion text NOT NULL,
    categoria character varying(20) NOT NULL,
    probabilidad smallint NOT NULL,
    impacto smallint NOT NULL,
    respuesta text,
    responsable_id bigint,
    estado character varying(12) DEFAULT 'abierto'::character varying NOT NULL,
    origen character varying(10) DEFAULT 'manual'::character varying NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    severidad smallint GENERATED ALWAYS AS ((probabilidad * impacto)) STORED,
    CONSTRAINT chk_riesgos_estado CHECK (((estado)::text = ANY ((ARRAY['abierto'::character varying, 'mitigado'::character varying, 'cerrado'::character varying, 'materializado'::character varying])::text[])))
);


--
-- Name: TABLE riesgos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.riesgos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN riesgos.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.riesgos.estado IS 'Valores permitidos: abierto, mitigado, cerrado, materializado';


--
-- Name: riesgos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.riesgos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: riesgos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.riesgos_id_seq OWNED BY public.riesgos.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    codigo character varying(40) NOT NULL,
    nombre character varying(120) NOT NULL,
    descripcion text,
    es_externo boolean DEFAULT false NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: ruteo_consumos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ruteo_consumos (
    id bigint NOT NULL,
    fecha date NOT NULL,
    driver character varying(20) NOT NULL,
    llamadas integer DEFAULT 0 NOT NULL,
    exitos integer DEFAULT 0 NOT NULL,
    fallos integer DEFAULT 0 NOT NULL,
    geocodificaciones integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE ruteo_consumos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ruteo_consumos IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: ruteo_consumos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ruteo_consumos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ruteo_consumos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ruteo_consumos_id_seq OWNED BY public.ruteo_consumos.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sessions IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: solicitud_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitud_detalles (
    id bigint NOT NULL,
    solicitud_id bigint NOT NULL,
    material_id bigint NOT NULL,
    cantidad numeric(14,3) NOT NULL,
    cantidad_atendida numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE solicitud_detalles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitud_detalles IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: solicitud_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitud_detalles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitud_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.solicitud_detalles_id_seq OWNED BY public.solicitud_detalles.id;


--
-- Name: solicitudes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitudes (
    id bigint NOT NULL,
    codigo character varying(30) NOT NULL,
    tipo character varying(10) NOT NULL,
    obra_id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    solicitante_id bigint NOT NULL,
    partida_id bigint,
    frente_id bigint,
    observacion_tecnica_id bigint,
    prioridad character varying(10),
    urgente boolean DEFAULT false NOT NULL,
    justificacion text,
    fecha_requerida date,
    estado character varying(20) NOT NULL,
    atendida_en timestamp(0) with time zone,
    aprobado_por bigint,
    aprobado_en timestamp(0) with time zone,
    motivo_rechazo text,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone,
    ubicacion_solicitud geography(Point,4326),
    CONSTRAINT chk_solicitudes_tipo CHECK (((tipo)::text = ANY ((ARRAY['almacen'::character varying, 'compra'::character varying])::text[]))),
    CONSTRAINT chk_solicitudes_tipo_estado CHECK (((((tipo)::text = 'almacen'::text) AND ((estado)::text = ANY ((ARRAY['registrada'::character varying, 'atendida'::character varying, 'anulada'::character varying])::text[]))) OR (((tipo)::text = 'compra'::text) AND ((estado)::text = ANY ((ARRAY['borrador'::character varying, 'solicitado'::character varying, 'aprobado'::character varying, 'rechazado'::character varying, 'atendido'::character varying, 'cerrado'::character varying])::text[])))))
);


--
-- Name: TABLE solicitudes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitudes IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN solicitudes.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitudes.tipo IS 'Valores permitidos: almacen, compra';


--
-- Name: COLUMN solicitudes.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitudes.estado IS 'Valores permitidos: registrada, atendida, anulada, borrador, solicitado, aprobado, rechazado, atendido, cerrado';


--
-- Name: solicitudes_acceso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitudes_acceso (
    id bigint NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    email character varying(160) NOT NULL,
    dni character varying(12),
    telefono character varying(30),
    empresa character varying(150),
    cargo character varying(150),
    rol_solicitado character varying(40) NOT NULL,
    motivo text NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    revisado_por bigint,
    revisado_en timestamp(0) with time zone,
    notas_revision text,
    ip inet,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    ruc character varying(11),
    CONSTRAINT chk_solicitudes_acceso_estado CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobada'::character varying, 'rechazada'::character varying])::text[])))
);


--
-- Name: TABLE solicitudes_acceso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitudes_acceso IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN solicitudes_acceso.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitudes_acceso.estado IS 'Valores permitidos: pendiente, aprobada, rechazada';


--
-- Name: solicitudes_acceso_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitudes_acceso_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitudes_acceso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.solicitudes_acceso_id_seq OWNED BY public.solicitudes_acceso.id;


--
-- Name: solicitudes_cambio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitudes_cambio (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    tipo character varying(10) NOT NULL,
    descripcion text NOT NULL,
    impacto_plazo_dias integer DEFAULT 0 NOT NULL,
    impacto_costo numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    estado character varying(12) DEFAULT 'solicitada'::character varying NOT NULL,
    solicitada_por bigint NOT NULL,
    decidida_por bigint,
    decidida_en timestamp(0) with time zone,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_solicitudes_cambio_estado CHECK (((estado)::text = ANY ((ARRAY['solicitada'::character varying, 'aprobada'::character varying, 'rechazada'::character varying])::text[])))
);


--
-- Name: TABLE solicitudes_cambio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitudes_cambio IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN solicitudes_cambio.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitudes_cambio.estado IS 'Valores permitidos: solicitada, aprobada, rechazada';


--
-- Name: solicitudes_cambio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitudes_cambio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitudes_cambio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.solicitudes_cambio_id_seq OWNED BY public.solicitudes_cambio.id;


--
-- Name: solicitudes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitudes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitudes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.solicitudes_id_seq OWNED BY public.solicitudes.id;


--
-- Name: stock_almacen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_almacen (
    id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    material_id bigint NOT NULL,
    ubicacion_id bigint,
    cantidad numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    cantidad_reservada numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    stock_minimo numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    stock_seguridad numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    punto_reorden numeric(14,3) DEFAULT '0'::numeric NOT NULL,
    stock_maximo numeric(14,3),
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    CONSTRAINT chk_stock_cantidad CHECK ((cantidad >= (0)::numeric)),
    CONSTRAINT chk_stock_reservada CHECK (((cantidad_reservada >= (0)::numeric) AND (cantidad_reservada <= cantidad)))
);


--
-- Name: TABLE stock_almacen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stock_almacen IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: stock_almacen_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_almacen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_almacen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_almacen_id_seq OWNED BY public.stock_almacen.id;


--
-- Name: trabajadores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trabajadores (
    id bigint NOT NULL,
    persona_id bigint NOT NULL,
    obra_id bigint,
    cargo character varying(80),
    frente_id bigint,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone
);


--
-- Name: TABLE trabajadores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trabajadores IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: trabajadores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trabajadores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trabajadores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trabajadores_id_seq OWNED BY public.trabajadores.id;


--
-- Name: transferencia_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transferencia_detalles (
    id bigint NOT NULL,
    transferencia_id bigint NOT NULL,
    material_id bigint NOT NULL,
    lote_id bigint,
    cantidad_solicitada numeric(14,3) NOT NULL,
    cantidad_despachada numeric(14,3),
    cantidad_recibida numeric(14,3),
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE transferencia_detalles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transferencia_detalles IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: transferencia_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transferencia_detalles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transferencia_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transferencia_detalles_id_seq OWNED BY public.transferencia_detalles.id;


--
-- Name: transferencia_posiciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transferencia_posiciones (
    id bigint NOT NULL,
    transferencia_id bigint NOT NULL,
    latitud numeric(10,7) NOT NULL,
    longitud numeric(10,7) NOT NULL,
    precision_m numeric(8,2),
    velocidad_kmh numeric(8,2),
    rumbo numeric(6,2),
    origen character varying(20) DEFAULT 'pwa'::character varying NOT NULL,
    uuid uuid NOT NULL,
    capturada_en timestamp(0) with time zone NOT NULL,
    recibida_en timestamp(0) with time zone NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    ubicacion geography(Point,4326)
);


--
-- Name: TABLE transferencia_posiciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transferencia_posiciones IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: transferencia_posiciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transferencia_posiciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transferencia_posiciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transferencia_posiciones_id_seq OWNED BY public.transferencia_posiciones.id;


--
-- Name: transferencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transferencias (
    id bigint NOT NULL,
    codigo character varying(30) NOT NULL,
    almacen_origen_id bigint NOT NULL,
    almacen_destino_id bigint NOT NULL,
    solicitud_id bigint,
    excedente_id bigint,
    motivo character varying(25) NOT NULL,
    estado character varying(25) DEFAULT 'sugerida'::character varying NOT NULL,
    generada_automaticamente boolean DEFAULT false NOT NULL,
    distancia_m numeric(12,1),
    eta_min numeric(8,1),
    puntaje numeric(8,4),
    creada_por bigint,
    aprobada_por bigint,
    aprobada_en timestamp(0) with time zone,
    despachado_por bigint,
    despachado_en timestamp(0) with time zone,
    observaciones_despacho text,
    recibido_por bigint,
    recibida_en timestamp(0) with time zone,
    firma_ruta character varying(255),
    foto_ruta character varying(255),
    hay_diferencias boolean DEFAULT false NOT NULL,
    observaciones_recepcion text,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    ubicacion_despacho geography(Point,4326),
    ubicacion_recepcion geography(Point,4326),
    CONSTRAINT chk_almacenes_distintos CHECK ((almacen_origen_id <> almacen_destino_id)),
    CONSTRAINT chk_transferencias_estado CHECK (((estado)::text = ANY ((ARRAY['sugerida'::character varying, 'solicitada'::character varying, 'aprobada'::character varying, 'en_transito'::character varying, 'completada'::character varying, 'anulada'::character varying])::text[])))
);


--
-- Name: TABLE transferencias; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transferencias IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: COLUMN transferencias.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transferencias.estado IS 'Valores permitidos: sugerida, solicitada, aprobada, en_transito, completada, anulada';


--
-- Name: transferencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transferencias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transferencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transferencias_id_seq OWNED BY public.transferencias.id;


--
-- Name: transportes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transportes (
    id bigint NOT NULL,
    orden_compra_id bigint,
    transferencia_id bigint,
    transportista character varying(160),
    conductor character varying(120),
    placa character varying(12),
    telefono character varying(30),
    guia_remision character varying(40),
    estado character varying(15) DEFAULT 'programado'::character varying NOT NULL,
    salida_en timestamp(0) with time zone,
    llegada_estimada_en timestamp(0) with time zone,
    llegada_real_en timestamp(0) with time zone,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE transportes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transportes IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: transportes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transportes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transportes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transportes_id_seq OWNED BY public.transportes.id;


--
-- Name: ubicaciones_almacen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ubicaciones_almacen (
    id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    codigo character varying(30) NOT NULL,
    descripcion character varying(160),
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE ubicaciones_almacen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ubicaciones_almacen IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: ubicaciones_almacen_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ubicaciones_almacen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ubicaciones_almacen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ubicaciones_almacen_id_seq OWNED BY public.ubicaciones_almacen.id;


--
-- Name: unidades_medida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades_medida (
    id bigint NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(60) NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE unidades_medida; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unidades_medida IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: unidades_medida_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidades_medida_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidades_medida_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidades_medida_id_seq OWNED BY public.unidades_medida.id;


--
-- Name: usuario_almacen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_almacen (
    usuario_id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    tipo character varying(10) DEFAULT 'operador'::character varying NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE usuario_almacen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuario_almacen IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: usuario_obra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_obra (
    usuario_id bigint NOT NULL,
    obra_id bigint NOT NULL,
    rol_id bigint,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE usuario_obra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuario_obra IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: usuario_rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_rol (
    usuario_id bigint NOT NULL,
    rol_id bigint NOT NULL,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE usuario_rol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuario_rol IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id bigint NOT NULL,
    persona_id bigint NOT NULL,
    email character varying(160) NOT NULL,
    email_verified_at timestamp(0) with time zone,
    password character varying(255) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    intentos_fallidos smallint DEFAULT '0'::smallint NOT NULL,
    bloqueado_hasta timestamp(0) with time zone,
    ultimo_acceso_en timestamp(0) with time zone,
    remember_token character varying(100),
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone,
    deleted_at timestamp(0) with time zone
);


--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: v_demanda_diaria; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_demanda_diaria AS
 WITH movimientos AS (
         SELECT kardex.almacen_id,
            kardex.material_id,
            date((kardex.created_at AT TIME ZONE 'America/Lima'::text)) AS fecha,
            (sum(abs(kardex.cantidad)))::numeric(14,3) AS cantidad
           FROM public.kardex
          WHERE ((kardex.tipo_movimiento)::text = ANY ((ARRAY['salida_consumo'::character varying, 'salida_transferencia'::character varying, 'salida_despacho'::character varying, 'salida_epp'::character varying])::text[]))
          GROUP BY kardex.almacen_id, kardex.material_id, (date((kardex.created_at AT TIME ZONE 'America/Lima'::text)))
        ), rangos AS (
         SELECT movimientos.almacen_id,
            movimientos.material_id,
            min(movimientos.fecha) AS desde,
            max(movimientos.fecha) AS hasta
           FROM movimientos
          GROUP BY movimientos.almacen_id, movimientos.material_id
        ), dias AS (
         SELECT r.almacen_id,
            r.material_id,
            (d_1.d)::date AS fecha
           FROM (rangos r
             CROSS JOIN LATERAL generate_series((r.desde)::timestamp with time zone, (r.hasta)::timestamp with time zone, '1 day'::interval) d_1(d))
        )
 SELECT d.almacen_id,
    d.material_id,
    d.fecha,
    (COALESCE(m.cantidad, (0)::numeric))::numeric(14,3) AS cantidad
   FROM (dias d
     LEFT JOIN movimientos m ON (((m.almacen_id = d.almacen_id) AND (m.material_id = d.material_id) AND (m.fecha = d.fecha))));


--
-- Name: valorizaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.valorizaciones (
    id bigint NOT NULL,
    obra_id bigint NOT NULL,
    periodo date NOT NULL,
    valor_planificado numeric(14,2) NOT NULL,
    valor_ganado numeric(14,2) NOT NULL,
    costo_real numeric(14,2) NOT NULL,
    estado character varying(12) DEFAULT 'borrador'::character varying NOT NULL,
    aprobada_por bigint,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- Name: TABLE valorizaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.valorizaciones IS 'Tabla del modelo consolidado Consorcio Pillco Marca';


--
-- Name: v_evm_obra; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_evm_obra AS
 WITH acum AS (
         SELECT v.obra_id,
            v.periodo,
            sum(v.valor_planificado) OVER w AS pv,
            sum(v.valor_ganado) OVER w AS ev,
            sum(v.costo_real) OVER w AS ac
           FROM public.valorizaciones v
          WINDOW w AS (PARTITION BY v.obra_id ORDER BY v.periodo)
        )
 SELECT c.obra_id,
    c.periodo,
    c.pv,
    c.ev,
    c.ac,
        CASE
            WHEN (c.pv > (0)::numeric) THEN round((c.ev / c.pv), 3)
            ELSE NULL::numeric
        END AS spi,
        CASE
            WHEN (c.ac > (0)::numeric) THEN round((c.ev / c.ac), 3)
            ELSE NULL::numeric
        END AS cpi,
    lb.bac,
        CASE
            WHEN ((c.ac > (0)::numeric) AND (c.ev > (0)::numeric)) THEN round((lb.bac / (c.ev / c.ac)), 2)
            ELSE NULL::numeric
        END AS eac,
        CASE
            WHEN ((c.ac > (0)::numeric) AND (c.ev > (0)::numeric)) THEN round((lb.bac - (lb.bac / (c.ev / c.ac))), 2)
            ELSE NULL::numeric
        END AS vac
   FROM (acum c
     LEFT JOIN public.lineas_base_costo lb ON (((lb.obra_id = c.obra_id) AND lb.vigente)));


--
-- Name: v_stock_critico; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_stock_critico AS
 SELECT s.almacen_id,
    a.nombre AS almacen,
    a.obra_id,
    s.material_id,
    m.nombre AS material,
    m.criticidad,
    s.cantidad,
    s.cantidad_reservada,
    (s.cantidad - s.cantidad_reservada) AS disponible,
    s.stock_minimo,
    s.punto_reorden,
        CASE
            WHEN (s.cantidad <= s.stock_minimo) THEN 'bajo_minimo'::text
            WHEN (s.cantidad <= s.punto_reorden) THEN 'en_reorden'::text
            ELSE NULL::text
        END AS situacion
   FROM ((public.stock_almacen s
     JOIN public.almacenes a ON ((a.id = s.almacen_id)))
     JOIN public.materiales m ON ((m.id = s.material_id)))
  WHERE ((s.cantidad <= s.punto_reorden) OR (s.cantidad <= s.stock_minimo));


--
-- Name: valorizaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.valorizaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: valorizaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.valorizaciones_id_seq OWNED BY public.valorizaciones.id;


--
-- Name: adelanto_eventos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adelanto_eventos ALTER COLUMN id SET DEFAULT nextval('public.adelanto_eventos_id_seq'::regclass);


--
-- Name: adelantos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adelantos ALTER COLUMN id SET DEFAULT nextval('public.adelantos_id_seq'::regclass);


--
-- Name: alertas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas ALTER COLUMN id SET DEFAULT nextval('public.alertas_id_seq'::regclass);


--
-- Name: almacenes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almacenes ALTER COLUMN id SET DEFAULT nextval('public.almacenes_id_seq'::regclass);


--
-- Name: asistencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias ALTER COLUMN id SET DEFAULT nextval('public.asistencias_id_seq'::regclass);


--
-- Name: auditorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias ALTER COLUMN id SET DEFAULT nextval('public.auditorias_id_seq'::regclass);


--
-- Name: avances_fisicos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avances_fisicos ALTER COLUMN id SET DEFAULT nextval('public.avances_fisicos_id_seq'::regclass);


--
-- Name: capacitaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacitaciones ALTER COLUMN id SET DEFAULT nextval('public.capacitaciones_id_seq'::regclass);


--
-- Name: categorias_material id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_material ALTER COLUMN id SET DEFAULT nextval('public.categorias_material_id_seq'::regclass);


--
-- Name: cotizacion_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_detalles ALTER COLUMN id SET DEFAULT nextval('public.cotizacion_detalles_id_seq'::regclass);


--
-- Name: cotizaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones ALTER COLUMN id SET DEFAULT nextval('public.cotizaciones_id_seq'::regclass);


--
-- Name: devolucion_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_detalles ALTER COLUMN id SET DEFAULT nextval('public.devolucion_detalles_id_seq'::regclass);


--
-- Name: devoluciones_proveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor ALTER COLUMN id SET DEFAULT nextval('public.devoluciones_proveedor_id_seq'::regclass);


--
-- Name: documentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos ALTER COLUMN id SET DEFAULT nextval('public.documentos_id_seq'::regclass);


--
-- Name: ejecuciones_analitica id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ejecuciones_analitica ALTER COLUMN id SET DEFAULT nextval('public.ejecuciones_analitica_id_seq'::regclass);


--
-- Name: epp_asignaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epp_asignaciones ALTER COLUMN id SET DEFAULT nextval('public.epp_asignaciones_id_seq'::regclass);


--
-- Name: excedentes_detectados id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excedentes_detectados ALTER COLUMN id SET DEFAULT nextval('public.excedentes_detectados_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: fase_criterios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_criterios ALTER COLUMN id SET DEFAULT nextval('public.fase_criterios_id_seq'::regclass);


--
-- Name: fase_requisitos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_requisitos ALTER COLUMN id SET DEFAULT nextval('public.fase_requisitos_id_seq'::regclass);


--
-- Name: frentes_trabajo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frentes_trabajo ALTER COLUMN id SET DEFAULT nextval('public.frentes_trabajo_id_seq'::regclass);


--
-- Name: hitos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos ALTER COLUMN id SET DEFAULT nextval('public.hitos_id_seq'::regclass);


--
-- Name: incidentes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidentes ALTER COLUMN id SET DEFAULT nextval('public.incidentes_id_seq'::regclass);


--
-- Name: indicadores_ambientales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicadores_ambientales ALTER COLUMN id SET DEFAULT nextval('public.indicadores_ambientales_id_seq'::regclass);


--
-- Name: inventario_fisico_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_fisico_detalles ALTER COLUMN id SET DEFAULT nextval('public.inventario_fisico_detalles_id_seq'::regclass);


--
-- Name: inventarios_fisicos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios_fisicos ALTER COLUMN id SET DEFAULT nextval('public.inventarios_fisicos_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: kardex id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kardex ALTER COLUMN id SET DEFAULT nextval('public.kardex_id_seq'::regclass);


--
-- Name: lineas_base_costo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_base_costo ALTER COLUMN id SET DEFAULT nextval('public.lineas_base_costo_id_seq'::regclass);


--
-- Name: lotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes ALTER COLUMN id SET DEFAULT nextval('public.lotes_id_seq'::regclass);


--
-- Name: marcaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marcaciones ALTER COLUMN id SET DEFAULT nextval('public.marcaciones_id_seq'::regclass);


--
-- Name: material_proveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_proveedor ALTER COLUMN id SET DEFAULT nextval('public.material_proveedor_id_seq'::regclass);


--
-- Name: materiales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materiales ALTER COLUMN id SET DEFAULT nextval('public.materiales_id_seq'::regclass);


--
-- Name: mediciones_ambientales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mediciones_ambientales ALTER COLUMN id SET DEFAULT nextval('public.mediciones_ambientales_id_seq'::regclass);


--
-- Name: mermas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mermas ALTER COLUMN id SET DEFAULT nextval('public.mermas_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: notificaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones ALTER COLUMN id SET DEFAULT nextval('public.notificaciones_id_seq'::regclass);


--
-- Name: obra_fases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obra_fases ALTER COLUMN id SET DEFAULT nextval('public.obra_fases_id_seq'::regclass);


--
-- Name: obras id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras ALTER COLUMN id SET DEFAULT nextval('public.obras_id_seq'::regclass);


--
-- Name: observaciones_tecnicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observaciones_tecnicas ALTER COLUMN id SET DEFAULT nextval('public.observaciones_tecnicas_id_seq'::regclass);


--
-- Name: orden_compra_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_compra_detalles ALTER COLUMN id SET DEFAULT nextval('public.orden_compra_detalles_id_seq'::regclass);


--
-- Name: ordenes_compra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra ALTER COLUMN id SET DEFAULT nextval('public.ordenes_compra_id_seq'::regclass);


--
-- Name: parametros_inventario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_inventario ALTER COLUMN id SET DEFAULT nextval('public.parametros_inventario_id_seq'::regclass);


--
-- Name: parametros_sistema id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_sistema ALTER COLUMN id SET DEFAULT nextval('public.parametros_sistema_id_seq'::regclass);


--
-- Name: partidas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidas ALTER COLUMN id SET DEFAULT nextval('public.partidas_id_seq'::regclass);


--
-- Name: permisos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos ALTER COLUMN id SET DEFAULT nextval('public.permisos_id_seq'::regclass);


--
-- Name: personas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas ALTER COLUMN id SET DEFAULT nextval('public.personas_id_seq'::regclass);


--
-- Name: planilla_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planilla_detalles ALTER COLUMN id SET DEFAULT nextval('public.planilla_detalles_id_seq'::regclass);


--
-- Name: planillas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planillas ALTER COLUMN id SET DEFAULT nextval('public.planillas_id_seq'::regclass);


--
-- Name: programas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programas ALTER COLUMN id SET DEFAULT nextval('public.programas_id_seq'::regclass);


--
-- Name: pronosticos_demanda id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pronosticos_demanda ALTER COLUMN id SET DEFAULT nextval('public.pronosticos_demanda_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: recepcion_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_detalles ALTER COLUMN id SET DEFAULT nextval('public.recepcion_detalles_id_seq'::regclass);


--
-- Name: recepciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepciones ALTER COLUMN id SET DEFAULT nextval('public.recepciones_id_seq'::regclass);


--
-- Name: residuos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residuos ALTER COLUMN id SET DEFAULT nextval('public.residuos_id_seq'::regclass);


--
-- Name: riesgos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riesgos ALTER COLUMN id SET DEFAULT nextval('public.riesgos_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: ruteo_consumos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ruteo_consumos ALTER COLUMN id SET DEFAULT nextval('public.ruteo_consumos_id_seq'::regclass);


--
-- Name: solicitud_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_detalles ALTER COLUMN id SET DEFAULT nextval('public.solicitud_detalles_id_seq'::regclass);


--
-- Name: solicitudes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_id_seq'::regclass);


--
-- Name: solicitudes_acceso id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_acceso ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_acceso_id_seq'::regclass);


--
-- Name: solicitudes_cambio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_cambio ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_cambio_id_seq'::regclass);


--
-- Name: stock_almacen id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_almacen ALTER COLUMN id SET DEFAULT nextval('public.stock_almacen_id_seq'::regclass);


--
-- Name: trabajadores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trabajadores ALTER COLUMN id SET DEFAULT nextval('public.trabajadores_id_seq'::regclass);


--
-- Name: transferencia_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_detalles ALTER COLUMN id SET DEFAULT nextval('public.transferencia_detalles_id_seq'::regclass);


--
-- Name: transferencia_posiciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_posiciones ALTER COLUMN id SET DEFAULT nextval('public.transferencia_posiciones_id_seq'::regclass);


--
-- Name: transferencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias ALTER COLUMN id SET DEFAULT nextval('public.transferencias_id_seq'::regclass);


--
-- Name: transportes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportes ALTER COLUMN id SET DEFAULT nextval('public.transportes_id_seq'::regclass);


--
-- Name: ubicaciones_almacen id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicaciones_almacen ALTER COLUMN id SET DEFAULT nextval('public.ubicaciones_almacen_id_seq'::regclass);


--
-- Name: unidades_medida id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida ALTER COLUMN id SET DEFAULT nextval('public.unidades_medida_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: valorizaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valorizaciones ALTER COLUMN id SET DEFAULT nextval('public.valorizaciones_id_seq'::regclass);


--
-- Name: adelanto_eventos adelanto_eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adelanto_eventos
    ADD CONSTRAINT adelanto_eventos_pkey PRIMARY KEY (id);


--
-- Name: adelantos adelantos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adelantos
    ADD CONSTRAINT adelantos_pkey PRIMARY KEY (id);


--
-- Name: alertas alertas_clave_idempotente_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_clave_idempotente_unique UNIQUE (clave_idempotente);


--
-- Name: alertas alertas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_pkey PRIMARY KEY (id);


--
-- Name: almacenes almacenes_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almacenes
    ADD CONSTRAINT almacenes_codigo_unique UNIQUE (codigo);


--
-- Name: almacenes almacenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almacenes
    ADD CONSTRAINT almacenes_pkey PRIMARY KEY (id);


--
-- Name: asistencias asistencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_pkey PRIMARY KEY (id);


--
-- Name: asistencias asistencias_trabajador_id_fecha_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_trabajador_id_fecha_unique UNIQUE (trabajador_id, fecha);


--
-- Name: auditorias auditorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_pkey PRIMARY KEY (id);


--
-- Name: avances_fisicos avances_fisicos_partida_id_periodo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avances_fisicos
    ADD CONSTRAINT avances_fisicos_partida_id_periodo_unique UNIQUE (partida_id, periodo);


--
-- Name: avances_fisicos avances_fisicos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avances_fisicos
    ADD CONSTRAINT avances_fisicos_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: capacitaciones capacitaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacitaciones
    ADD CONSTRAINT capacitaciones_pkey PRIMARY KEY (id);


--
-- Name: categorias_material categorias_material_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_material
    ADD CONSTRAINT categorias_material_nombre_unique UNIQUE (nombre);


--
-- Name: categorias_material categorias_material_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_material
    ADD CONSTRAINT categorias_material_pkey PRIMARY KEY (id);


--
-- Name: cotizacion_detalles cotizacion_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_detalles
    ADD CONSTRAINT cotizacion_detalles_pkey PRIMARY KEY (id);


--
-- Name: cotizaciones cotizaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_pkey PRIMARY KEY (id);


--
-- Name: devolucion_detalles devolucion_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_detalles
    ADD CONSTRAINT devolucion_detalles_pkey PRIMARY KEY (id);


--
-- Name: devoluciones_proveedor devoluciones_proveedor_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor
    ADD CONSTRAINT devoluciones_proveedor_codigo_unique UNIQUE (codigo);


--
-- Name: devoluciones_proveedor devoluciones_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor
    ADD CONSTRAINT devoluciones_proveedor_pkey PRIMARY KEY (id);


--
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id);


--
-- Name: ejecuciones_analitica ejecuciones_analitica_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ejecuciones_analitica
    ADD CONSTRAINT ejecuciones_analitica_pkey PRIMARY KEY (id);


--
-- Name: epp_asignaciones epp_asignaciones_material_id_numero_serie_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epp_asignaciones
    ADD CONSTRAINT epp_asignaciones_material_id_numero_serie_unique UNIQUE (material_id, numero_serie);


--
-- Name: epp_asignaciones epp_asignaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epp_asignaciones
    ADD CONSTRAINT epp_asignaciones_pkey PRIMARY KEY (id);


--
-- Name: excedentes_detectados excedentes_detectados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excedentes_detectados
    ADD CONSTRAINT excedentes_detectados_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: fase_criterios fase_criterios_fase_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_criterios
    ADD CONSTRAINT fase_criterios_fase_codigo_unique UNIQUE (fase, codigo);


--
-- Name: fase_criterios fase_criterios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_criterios
    ADD CONSTRAINT fase_criterios_pkey PRIMARY KEY (id);


--
-- Name: fase_requisitos fase_requisitos_fase_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_requisitos
    ADD CONSTRAINT fase_requisitos_fase_codigo_unique UNIQUE (fase, codigo);


--
-- Name: fase_requisitos fase_requisitos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_requisitos
    ADD CONSTRAINT fase_requisitos_pkey PRIMARY KEY (id);


--
-- Name: frentes_trabajo frentes_trabajo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frentes_trabajo
    ADD CONSTRAINT frentes_trabajo_pkey PRIMARY KEY (id);


--
-- Name: hitos hitos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos
    ADD CONSTRAINT hitos_pkey PRIMARY KEY (id);


--
-- Name: incidentes incidentes_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidentes
    ADD CONSTRAINT incidentes_codigo_unique UNIQUE (codigo);


--
-- Name: incidentes incidentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidentes
    ADD CONSTRAINT incidentes_pkey PRIMARY KEY (id);


--
-- Name: indicadores_ambientales indicadores_ambientales_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicadores_ambientales
    ADD CONSTRAINT indicadores_ambientales_codigo_unique UNIQUE (codigo);


--
-- Name: indicadores_ambientales indicadores_ambientales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicadores_ambientales
    ADD CONSTRAINT indicadores_ambientales_pkey PRIMARY KEY (id);


--
-- Name: inventario_fisico_detalles inventario_fisico_detalles_inventario_id_material_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_fisico_detalles
    ADD CONSTRAINT inventario_fisico_detalles_inventario_id_material_id_unique UNIQUE (inventario_id, material_id);


--
-- Name: inventario_fisico_detalles inventario_fisico_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_fisico_detalles
    ADD CONSTRAINT inventario_fisico_detalles_pkey PRIMARY KEY (id);


--
-- Name: inventarios_fisicos inventarios_fisicos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios_fisicos
    ADD CONSTRAINT inventarios_fisicos_pkey PRIMARY KEY (id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: kardex kardex_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kardex
    ADD CONSTRAINT kardex_pkey PRIMARY KEY (id);


--
-- Name: lineas_base_costo lineas_base_costo_obra_id_version_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_base_costo
    ADD CONSTRAINT lineas_base_costo_obra_id_version_unique UNIQUE (obra_id, version);


--
-- Name: lineas_base_costo lineas_base_costo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_base_costo
    ADD CONSTRAINT lineas_base_costo_pkey PRIMARY KEY (id);


--
-- Name: lotes lotes_material_id_codigo_lote_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_material_id_codigo_lote_unique UNIQUE (material_id, codigo_lote);


--
-- Name: lotes lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (id);


--
-- Name: marcaciones marcaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marcaciones
    ADD CONSTRAINT marcaciones_pkey PRIMARY KEY (id);


--
-- Name: marcaciones marcaciones_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marcaciones
    ADD CONSTRAINT marcaciones_uuid_unique UNIQUE (uuid);


--
-- Name: material_proveedor material_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_proveedor
    ADD CONSTRAINT material_proveedor_pkey PRIMARY KEY (id);


--
-- Name: materiales materiales_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materiales
    ADD CONSTRAINT materiales_codigo_unique UNIQUE (codigo);


--
-- Name: materiales materiales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materiales
    ADD CONSTRAINT materiales_pkey PRIMARY KEY (id);


--
-- Name: mediciones_ambientales mediciones_ambientales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mediciones_ambientales
    ADD CONSTRAINT mediciones_ambientales_pkey PRIMARY KEY (id);


--
-- Name: mermas mermas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mermas
    ADD CONSTRAINT mermas_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: obra_fases obra_fases_obra_id_fase_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obra_fases
    ADD CONSTRAINT obra_fases_obra_id_fase_unique UNIQUE (obra_id, fase);


--
-- Name: obra_fases obra_fases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obra_fases
    ADD CONSTRAINT obra_fases_pkey PRIMARY KEY (id);


--
-- Name: obras obras_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_codigo_unique UNIQUE (codigo);


--
-- Name: obras obras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_pkey PRIMARY KEY (id);


--
-- Name: observaciones_tecnicas observaciones_tecnicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observaciones_tecnicas
    ADD CONSTRAINT observaciones_tecnicas_pkey PRIMARY KEY (id);


--
-- Name: orden_compra_detalles orden_compra_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_compra_detalles
    ADD CONSTRAINT orden_compra_detalles_pkey PRIMARY KEY (id);


--
-- Name: ordenes_compra ordenes_compra_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT ordenes_compra_codigo_unique UNIQUE (codigo);


--
-- Name: ordenes_compra ordenes_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT ordenes_compra_pkey PRIMARY KEY (id);


--
-- Name: parametros_inventario parametros_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_inventario
    ADD CONSTRAINT parametros_inventario_pkey PRIMARY KEY (id);


--
-- Name: parametros_sistema parametros_sistema_clave_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_sistema
    ADD CONSTRAINT parametros_sistema_clave_unique UNIQUE (clave);


--
-- Name: parametros_sistema parametros_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_sistema
    ADD CONSTRAINT parametros_sistema_pkey PRIMARY KEY (id);


--
-- Name: partidas partidas_obra_id_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidas
    ADD CONSTRAINT partidas_obra_id_codigo_unique UNIQUE (obra_id, codigo);


--
-- Name: partidas partidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidas
    ADD CONSTRAINT partidas_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: permiso_rol permiso_rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_rol
    ADD CONSTRAINT permiso_rol_pkey PRIMARY KEY (rol_id, permiso_id);


--
-- Name: permisos permisos_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_codigo_unique UNIQUE (codigo);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);


--
-- Name: personas personas_dni_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_dni_unique UNIQUE (dni);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id);


--
-- Name: planilla_detalles planilla_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planilla_detalles
    ADD CONSTRAINT planilla_detalles_pkey PRIMARY KEY (id);


--
-- Name: planilla_detalles planilla_detalles_planilla_id_trabajador_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planilla_detalles
    ADD CONSTRAINT planilla_detalles_planilla_id_trabajador_id_unique UNIQUE (planilla_id, trabajador_id);


--
-- Name: planillas planillas_obra_id_periodo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planillas
    ADD CONSTRAINT planillas_obra_id_periodo_unique UNIQUE (obra_id, periodo);


--
-- Name: planillas planillas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planillas
    ADD CONSTRAINT planillas_pkey PRIMARY KEY (id);


--
-- Name: programas programas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programas
    ADD CONSTRAINT programas_pkey PRIMARY KEY (id);


--
-- Name: pronosticos_demanda pronosticos_demanda_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pronosticos_demanda
    ADD CONSTRAINT pronosticos_demanda_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_ruc_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_ruc_unique UNIQUE (ruc);


--
-- Name: recepcion_detalles recepcion_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_detalles
    ADD CONSTRAINT recepcion_detalles_pkey PRIMARY KEY (id);


--
-- Name: recepciones recepciones_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepciones
    ADD CONSTRAINT recepciones_codigo_unique UNIQUE (codigo);


--
-- Name: recepciones recepciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepciones
    ADD CONSTRAINT recepciones_pkey PRIMARY KEY (id);


--
-- Name: residuos residuos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residuos
    ADD CONSTRAINT residuos_pkey PRIMARY KEY (id);


--
-- Name: riesgos riesgos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riesgos
    ADD CONSTRAINT riesgos_pkey PRIMARY KEY (id);


--
-- Name: roles roles_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_codigo_unique UNIQUE (codigo);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: ruteo_consumos ruteo_consumos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ruteo_consumos
    ADD CONSTRAINT ruteo_consumos_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: solicitud_detalles solicitud_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_detalles
    ADD CONSTRAINT solicitud_detalles_pkey PRIMARY KEY (id);


--
-- Name: solicitud_detalles solicitud_detalles_solicitud_id_material_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_detalles
    ADD CONSTRAINT solicitud_detalles_solicitud_id_material_id_unique UNIQUE (solicitud_id, material_id);


--
-- Name: solicitudes_acceso solicitudes_acceso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_acceso
    ADD CONSTRAINT solicitudes_acceso_pkey PRIMARY KEY (id);


--
-- Name: solicitudes_cambio solicitudes_cambio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_cambio
    ADD CONSTRAINT solicitudes_cambio_pkey PRIMARY KEY (id);


--
-- Name: solicitudes solicitudes_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_codigo_unique UNIQUE (codigo);


--
-- Name: solicitudes solicitudes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_pkey PRIMARY KEY (id);


--
-- Name: stock_almacen stock_almacen_almacen_id_material_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_almacen
    ADD CONSTRAINT stock_almacen_almacen_id_material_id_unique UNIQUE (almacen_id, material_id);


--
-- Name: stock_almacen stock_almacen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_almacen
    ADD CONSTRAINT stock_almacen_pkey PRIMARY KEY (id);


--
-- Name: trabajadores trabajadores_persona_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trabajadores
    ADD CONSTRAINT trabajadores_persona_id_unique UNIQUE (persona_id);


--
-- Name: trabajadores trabajadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trabajadores
    ADD CONSTRAINT trabajadores_pkey PRIMARY KEY (id);


--
-- Name: transferencia_detalles transferencia_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_detalles
    ADD CONSTRAINT transferencia_detalles_pkey PRIMARY KEY (id);


--
-- Name: transferencia_posiciones transferencia_posiciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_posiciones
    ADD CONSTRAINT transferencia_posiciones_pkey PRIMARY KEY (id);


--
-- Name: transferencia_posiciones transferencia_posiciones_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_posiciones
    ADD CONSTRAINT transferencia_posiciones_uuid_unique UNIQUE (uuid);


--
-- Name: transferencias transferencias_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_codigo_unique UNIQUE (codigo);


--
-- Name: transferencias transferencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_pkey PRIMARY KEY (id);


--
-- Name: transportes transportes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportes
    ADD CONSTRAINT transportes_pkey PRIMARY KEY (id);


--
-- Name: ubicaciones_almacen ubicaciones_almacen_almacen_id_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicaciones_almacen
    ADD CONSTRAINT ubicaciones_almacen_almacen_id_codigo_unique UNIQUE (almacen_id, codigo);


--
-- Name: ubicaciones_almacen ubicaciones_almacen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicaciones_almacen
    ADD CONSTRAINT ubicaciones_almacen_pkey PRIMARY KEY (id);


--
-- Name: unidades_medida unidades_medida_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_codigo_unique UNIQUE (codigo);


--
-- Name: unidades_medida unidades_medida_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_pkey PRIMARY KEY (id);


--
-- Name: material_proveedor uq_material_proveedor; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_proveedor
    ADD CONSTRAINT uq_material_proveedor UNIQUE (material_id, proveedor_id);


--
-- Name: pronosticos_demanda uq_pronostico_serie_fecha; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pronosticos_demanda
    ADD CONSTRAINT uq_pronostico_serie_fecha UNIQUE (almacen_id, material_id, fecha, modelo_version);


--
-- Name: ruteo_consumos uq_ruteo_consumo_dia; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ruteo_consumos
    ADD CONSTRAINT uq_ruteo_consumo_dia UNIQUE (fecha, driver);


--
-- Name: usuario_almacen usuario_almacen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_almacen
    ADD CONSTRAINT usuario_almacen_pkey PRIMARY KEY (usuario_id, almacen_id);


--
-- Name: usuario_obra usuario_obra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_obra
    ADD CONSTRAINT usuario_obra_pkey PRIMARY KEY (usuario_id, obra_id);


--
-- Name: usuario_rol usuario_rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_pkey PRIMARY KEY (usuario_id, rol_id);


--
-- Name: usuarios usuarios_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_unique UNIQUE (email);


--
-- Name: usuarios usuarios_persona_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_persona_id_unique UNIQUE (persona_id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: valorizaciones valorizaciones_obra_id_periodo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valorizaciones
    ADD CONSTRAINT valorizaciones_obra_id_periodo_unique UNIQUE (obra_id, periodo);


--
-- Name: valorizaciones valorizaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valorizaciones
    ADD CONSTRAINT valorizaciones_pkey PRIMARY KEY (id);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: failed_jobs_connection_queue_failed_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX failed_jobs_connection_queue_failed_at_index ON public.failed_jobs USING btree (connection, queue, failed_at);


--
-- Name: fase_criterios_fase_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fase_criterios_fase_index ON public.fase_criterios USING btree (fase);


--
-- Name: fase_requisitos_fase_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fase_requisitos_fase_index ON public.fase_requisitos USING btree (fase);


--
-- Name: idx_adelanto_eventos_adelanto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adelanto_eventos_adelanto_id ON public.adelanto_eventos USING btree (adelanto_id);


--
-- Name: idx_adelanto_eventos_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adelanto_eventos_usuario_id ON public.adelanto_eventos USING btree (usuario_id);


--
-- Name: idx_adelantos_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adelantos_obra_id ON public.adelantos USING btree (obra_id);


--
-- Name: idx_adelantos_registrado_por_fin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adelantos_registrado_por_fin ON public.adelantos USING btree (registrado_por_financiera);


--
-- Name: idx_adelantos_solicitado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adelantos_solicitado_por ON public.adelantos USING btree (solicitado_por);


--
-- Name: idx_alertas_almacen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alertas_almacen_id ON public.alertas USING btree (almacen_id);


--
-- Name: idx_alertas_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alertas_estado ON public.alertas USING btree (estado, severidad);


--
-- Name: idx_alertas_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alertas_material_id ON public.alertas USING btree (material_id);


--
-- Name: idx_alertas_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alertas_obra_id ON public.alertas USING btree (obra_id);


--
-- Name: idx_alertas_reconocida_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alertas_reconocida_por ON public.alertas USING btree (reconocida_por);


--
-- Name: idx_alertas_transferencia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alertas_transferencia_id ON public.alertas USING btree (transferencia_id);


--
-- Name: idx_almacenes_obra; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_almacenes_obra ON public.almacenes USING btree (obra_id);


--
-- Name: idx_almacenes_ubicacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_almacenes_ubicacion ON public.almacenes USING gist (ubicacion);


--
-- Name: idx_asistencias_aprobada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asistencias_aprobada_por ON public.asistencias USING btree (aprobada_por);


--
-- Name: idx_asistencias_corregida_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asistencias_corregida_por ON public.asistencias USING btree (corregida_por);


--
-- Name: idx_asistencias_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asistencias_obra_id ON public.asistencias USING btree (obra_id);


--
-- Name: idx_auditorias_entidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditorias_entidad ON public.auditorias USING btree (entidad, entidad_id);


--
-- Name: idx_auditorias_entidad_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditorias_entidad_fecha ON public.auditorias USING btree (entidad, created_at);


--
-- Name: idx_auditorias_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditorias_usuario ON public.auditorias USING btree (usuario_id, created_at);


--
-- Name: idx_avances_fisicos_frente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avances_fisicos_frente_id ON public.avances_fisicos USING btree (frente_id);


--
-- Name: idx_avances_fisicos_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avances_fisicos_obra_id ON public.avances_fisicos USING btree (obra_id);


--
-- Name: idx_avances_fisicos_registrado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avances_fisicos_registrado_por ON public.avances_fisicos USING btree (registrado_por);


--
-- Name: idx_capacitaciones_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capacitaciones_obra_id ON public.capacitaciones USING btree (obra_id);


--
-- Name: idx_capacitaciones_programada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capacitaciones_programada_por ON public.capacitaciones USING btree (programada_por);


--
-- Name: idx_cotizacion_detalles_cotizacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizacion_detalles_cotizacion_id ON public.cotizacion_detalles USING btree (cotizacion_id);


--
-- Name: idx_cotizacion_detalles_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizacion_detalles_material_id ON public.cotizacion_detalles USING btree (material_id);


--
-- Name: idx_cotizaciones_proveedor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizaciones_proveedor_id ON public.cotizaciones USING btree (proveedor_id);


--
-- Name: idx_cotizaciones_solicitud_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizaciones_solicitud_id ON public.cotizaciones USING btree (solicitud_id);


--
-- Name: idx_devolucion_detalles_devolucion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devolucion_detalles_devolucion_id ON public.devolucion_detalles USING btree (devolucion_id);


--
-- Name: idx_devolucion_detalles_lote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devolucion_detalles_lote_id ON public.devolucion_detalles USING btree (lote_id);


--
-- Name: idx_devolucion_detalles_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devolucion_detalles_material_id ON public.devolucion_detalles USING btree (material_id);


--
-- Name: idx_devoluciones_proveedor_aprobada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devoluciones_proveedor_aprobada_por ON public.devoluciones_proveedor USING btree (aprobada_por);


--
-- Name: idx_devoluciones_proveedor_proveedor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devoluciones_proveedor_proveedor_id ON public.devoluciones_proveedor USING btree (proveedor_id);


--
-- Name: idx_devoluciones_proveedor_recepcion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devoluciones_proveedor_recepcion_id ON public.devoluciones_proveedor USING btree (recepcion_id);


--
-- Name: idx_devoluciones_proveedor_registrada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devoluciones_proveedor_registrada_por ON public.devoluciones_proveedor USING btree (registrada_por);


--
-- Name: idx_documentos_documentable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_documentable ON public.documentos USING btree (documentable_type, documentable_id);


--
-- Name: idx_documentos_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_obra_id ON public.documentos USING btree (obra_id);


--
-- Name: idx_documentos_subido_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_subido_por ON public.documentos USING btree (subido_por);


--
-- Name: idx_epp_asignaciones_almacen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epp_asignaciones_almacen_id ON public.epp_asignaciones USING btree (almacen_id);


--
-- Name: idx_epp_asignaciones_entregado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epp_asignaciones_entregado_por ON public.epp_asignaciones USING btree (entregado_por);


--
-- Name: idx_epp_asignaciones_trabajador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epp_asignaciones_trabajador_id ON public.epp_asignaciones USING btree (trabajador_id);


--
-- Name: idx_excedentes_detectados_almacen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_excedentes_detectados_almacen_id ON public.excedentes_detectados USING btree (almacen_id);


--
-- Name: idx_excedentes_detectados_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_excedentes_detectados_material_id ON public.excedentes_detectados USING btree (material_id);


--
-- Name: idx_excedentes_detectados_obra_origen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_excedentes_detectados_obra_origen_id ON public.excedentes_detectados USING btree (obra_origen_id);


--
-- Name: idx_frentes_trabajo_maestro_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_frentes_trabajo_maestro_obra_id ON public.frentes_trabajo USING btree (maestro_obra_id);


--
-- Name: idx_frentes_trabajo_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_frentes_trabajo_obra_id ON public.frentes_trabajo USING btree (obra_id);


--
-- Name: idx_hitos_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hitos_obra_id ON public.hitos USING btree (obra_id);


--
-- Name: idx_incidentes_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidentes_obra_id ON public.incidentes USING btree (obra_id);


--
-- Name: idx_incidentes_reportado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidentes_reportado_por ON public.incidentes USING btree (reportado_por);


--
-- Name: idx_incidentes_reporte_tecnico_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidentes_reporte_tecnico_id ON public.incidentes USING btree (reporte_tecnico_id);


--
-- Name: idx_incidentes_trabajador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidentes_trabajador_id ON public.incidentes USING btree (trabajador_id);


--
-- Name: idx_incidentes_ubicacion_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidentes_ubicacion_gist ON public.incidentes USING gist (ubicacion);


--
-- Name: idx_incidentes_validado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidentes_validado_por ON public.incidentes USING btree (validado_por);


--
-- Name: idx_inventario_fisico_detalles_ajuste_aprobado_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_fisico_detalles_ajuste_aprobado_po ON public.inventario_fisico_detalles USING btree (ajuste_aprobado_por);


--
-- Name: idx_inventario_fisico_detalles_justificacion_revi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_fisico_detalles_justificacion_revi ON public.inventario_fisico_detalles USING btree (justificacion_revisada_por);


--
-- Name: idx_inventario_fisico_detalles_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_fisico_detalles_material_id ON public.inventario_fisico_detalles USING btree (material_id);


--
-- Name: idx_inventarios_fisicos_almacen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_fisicos_almacen_id ON public.inventarios_fisicos USING btree (almacen_id);


--
-- Name: idx_inventarios_fisicos_cerrado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_fisicos_cerrado_por ON public.inventarios_fisicos USING btree (cerrado_por);


--
-- Name: idx_inventarios_fisicos_programado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_fisicos_programado_por ON public.inventarios_fisicos USING btree (programado_por);


--
-- Name: idx_kardex_alm_mat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kardex_alm_mat ON public.kardex USING btree (almacen_id, material_id, created_at);


--
-- Name: idx_kardex_doc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kardex_doc ON public.kardex USING btree (documento_tipo, documento_id);


--
-- Name: idx_kardex_lote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kardex_lote_id ON public.kardex USING btree (lote_id);


--
-- Name: idx_kardex_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kardex_material_id ON public.kardex USING btree (material_id);


--
-- Name: idx_kardex_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kardex_usuario_id ON public.kardex USING btree (usuario_id);


--
-- Name: idx_lineas_base_costo_aprobada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lineas_base_costo_aprobada_por ON public.lineas_base_costo USING btree (aprobada_por);


--
-- Name: idx_lotes_proveedor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lotes_proveedor_id ON public.lotes USING btree (proveedor_id);


--
-- Name: idx_marc_trab_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marc_trab_fecha ON public.marcaciones USING btree (trabajador_id, marcado_en);


--
-- Name: idx_marcaciones_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marcaciones_obra_id ON public.marcaciones USING btree (obra_id);


--
-- Name: idx_marcaciones_ubicacion_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marcaciones_ubicacion_gist ON public.marcaciones USING gist (ubicacion);


--
-- Name: idx_material_proveedor_principal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_material_proveedor_principal ON public.material_proveedor USING btree (material_id, es_principal);


--
-- Name: idx_material_proveedor_proveedor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_material_proveedor_proveedor_id ON public.material_proveedor USING btree (proveedor_id);


--
-- Name: idx_materiales_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materiales_categoria ON public.materiales USING btree (categoria_id);


--
-- Name: idx_materiales_unidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materiales_unidad_id ON public.materiales USING btree (unidad_id);


--
-- Name: idx_mediciones_ambientales_indicador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mediciones_ambientales_indicador_id ON public.mediciones_ambientales USING btree (indicador_id);


--
-- Name: idx_mediciones_ambientales_medida_aplicada_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mediciones_ambientales_medida_aplicada_po ON public.mediciones_ambientales USING btree (medida_aplicada_por);


--
-- Name: idx_mediciones_ambientales_medido_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mediciones_ambientales_medido_por ON public.mediciones_ambientales USING btree (medido_por);


--
-- Name: idx_mediciones_ambientales_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mediciones_ambientales_obra_id ON public.mediciones_ambientales USING btree (obra_id);


--
-- Name: idx_mermas_almacen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mermas_almacen_id ON public.mermas USING btree (almacen_id);


--
-- Name: idx_mermas_aprobada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mermas_aprobada_por ON public.mermas USING btree (aprobada_por);


--
-- Name: idx_mermas_lote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mermas_lote_id ON public.mermas USING btree (lote_id);


--
-- Name: idx_mermas_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mermas_material_id ON public.mermas USING btree (material_id);


--
-- Name: idx_mermas_registrada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mermas_registrada_por ON public.mermas USING btree (registrada_por);


--
-- Name: idx_mermas_transferencia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mermas_transferencia_id ON public.mermas USING btree (transferencia_id);


--
-- Name: idx_notif_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_usuario ON public.notificaciones USING btree (usuario_id, leida_en);


--
-- Name: idx_notificaciones_alerta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificaciones_alerta_id ON public.notificaciones USING btree (alerta_id);


--
-- Name: idx_obra_fases_aprobada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obra_fases_aprobada_por ON public.obra_fases USING btree (aprobada_por);


--
-- Name: idx_obras_acta_recepcion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_acta_recepcion_id ON public.obras USING btree (acta_recepcion_id);


--
-- Name: idx_obras_cerrado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_cerrado_por ON public.obras USING btree (cerrado_por);


--
-- Name: idx_obras_informe_final_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_informe_final_id ON public.obras USING btree (informe_final_id);


--
-- Name: idx_obras_programa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_programa_id ON public.obras USING btree (programa_id);


--
-- Name: idx_obras_residente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_residente_id ON public.obras USING btree (residente_id);


--
-- Name: idx_obras_ubicacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_ubicacion ON public.obras USING gist (ubicacion);


--
-- Name: idx_observaciones_tecnicas_acta_levantamiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observaciones_tecnicas_acta_levantamiento ON public.observaciones_tecnicas USING btree (acta_levantamiento_id);


--
-- Name: idx_observaciones_tecnicas_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observaciones_tecnicas_obra_id ON public.observaciones_tecnicas USING btree (obra_id);


--
-- Name: idx_observaciones_tecnicas_responsable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observaciones_tecnicas_responsable_id ON public.observaciones_tecnicas USING btree (responsable_id);


--
-- Name: idx_oc_obra_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oc_obra_estado ON public.ordenes_compra USING btree (obra_id, estado);


--
-- Name: idx_orden_compra_detalles_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_compra_detalles_material_id ON public.orden_compra_detalles USING btree (material_id);


--
-- Name: idx_orden_compra_detalles_orden_compra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_compra_detalles_orden_compra_id ON public.orden_compra_detalles USING btree (orden_compra_id);


--
-- Name: idx_ordenes_compra_almacen_destino_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_compra_almacen_destino_id ON public.ordenes_compra USING btree (almacen_destino_id);


--
-- Name: idx_ordenes_compra_cotizacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_compra_cotizacion_id ON public.ordenes_compra USING btree (cotizacion_id);


--
-- Name: idx_ordenes_compra_emitida_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_compra_emitida_por ON public.ordenes_compra USING btree (emitida_por);


--
-- Name: idx_ordenes_compra_proveedor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_compra_proveedor_id ON public.ordenes_compra USING btree (proveedor_id);


--
-- Name: idx_ordenes_compra_solicitud_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordenes_compra_solicitud_id ON public.ordenes_compra USING btree (solicitud_id);


--
-- Name: idx_parametros_material_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parametros_material_fecha ON public.parametros_inventario USING btree (material_id, calculado_en);


--
-- Name: idx_parametros_vigente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parametros_vigente ON public.parametros_inventario USING btree (almacen_id, material_id, vigente);


--
-- Name: idx_partidas_frente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partidas_frente_id ON public.partidas USING btree (frente_id);


--
-- Name: idx_permiso_rol_permiso_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permiso_rol_permiso_id ON public.permiso_rol USING btree (permiso_id);


--
-- Name: idx_planilla_detalles_trabajador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_planilla_detalles_trabajador_id ON public.planilla_detalles USING btree (trabajador_id);


--
-- Name: idx_planillas_procesada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_planillas_procesada_por ON public.planillas USING btree (procesada_por);


--
-- Name: idx_posiciones_transferencia_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posiciones_transferencia_fecha ON public.transferencia_posiciones USING btree (transferencia_id, capturada_en);


--
-- Name: idx_posiciones_ubicacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posiciones_ubicacion ON public.transferencia_posiciones USING gist (ubicacion);


--
-- Name: idx_pronosticos_demanda_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pronosticos_demanda_material_id ON public.pronosticos_demanda USING btree (material_id);


--
-- Name: idx_recepcion_detalles_lote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recepcion_detalles_lote_id ON public.recepcion_detalles USING btree (lote_id);


--
-- Name: idx_recepcion_detalles_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recepcion_detalles_material_id ON public.recepcion_detalles USING btree (material_id);


--
-- Name: idx_recepcion_detalles_orden_compra_detal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recepcion_detalles_orden_compra_detal ON public.recepcion_detalles USING btree (orden_compra_detalle_id);


--
-- Name: idx_recepcion_detalles_recepcion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recepcion_detalles_recepcion_id ON public.recepcion_detalles USING btree (recepcion_id);


--
-- Name: idx_recepcion_detalles_ubicacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recepcion_detalles_ubicacion_id ON public.recepcion_detalles USING btree (ubicacion_id);


--
-- Name: idx_recepciones_almacen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recepciones_almacen_id ON public.recepciones USING btree (almacen_id);


--
-- Name: idx_recepciones_almacenero_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recepciones_almacenero_id ON public.recepciones USING btree (almacenero_id);


--
-- Name: idx_recepciones_orden_compra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recepciones_orden_compra_id ON public.recepciones USING btree (orden_compra_id);


--
-- Name: idx_recepciones_ubicacion_recepc_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recepciones_ubicacion_recepc_gist ON public.recepciones USING gist (ubicacion_recepcion);


--
-- Name: idx_residuos_almacen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_residuos_almacen_id ON public.residuos USING btree (almacen_id);


--
-- Name: idx_residuos_manifiesto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_residuos_manifiesto_id ON public.residuos USING btree (manifiesto_id);


--
-- Name: idx_residuos_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_residuos_material_id ON public.residuos USING btree (material_id);


--
-- Name: idx_residuos_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_residuos_obra_id ON public.residuos USING btree (obra_id);


--
-- Name: idx_residuos_proveedor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_residuos_proveedor_id ON public.residuos USING btree (proveedor_id);


--
-- Name: idx_residuos_registrado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_residuos_registrado_por ON public.residuos USING btree (registrado_por);


--
-- Name: idx_residuos_transferencia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_residuos_transferencia_id ON public.residuos USING btree (transferencia_id);


--
-- Name: idx_riesgos_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_riesgos_obra_id ON public.riesgos USING btree (obra_id);


--
-- Name: idx_riesgos_responsable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_riesgos_responsable_id ON public.riesgos USING btree (responsable_id);


--
-- Name: idx_solicitud_detalles_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitud_detalles_material_id ON public.solicitud_detalles USING btree (material_id);


--
-- Name: idx_solicitudes_acceso_revisado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_acceso_revisado_por ON public.solicitudes_acceso USING btree (revisado_por);


--
-- Name: idx_solicitudes_almacen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_almacen_id ON public.solicitudes USING btree (almacen_id);


--
-- Name: idx_solicitudes_aprobado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_aprobado_por ON public.solicitudes USING btree (aprobado_por);


--
-- Name: idx_solicitudes_cambio_decidida_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_cambio_decidida_por ON public.solicitudes_cambio USING btree (decidida_por);


--
-- Name: idx_solicitudes_cambio_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_cambio_obra_id ON public.solicitudes_cambio USING btree (obra_id);


--
-- Name: idx_solicitudes_cambio_solicitada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_cambio_solicitada_por ON public.solicitudes_cambio USING btree (solicitada_por);


--
-- Name: idx_solicitudes_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_estado ON public.solicitudes_acceso USING btree (estado, created_at);


--
-- Name: idx_solicitudes_frente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_frente_id ON public.solicitudes USING btree (frente_id);


--
-- Name: idx_solicitudes_obra_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_obra_estado ON public.solicitudes USING btree (obra_id, estado);


--
-- Name: idx_solicitudes_observacion_tecnic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_observacion_tecnic ON public.solicitudes USING btree (observacion_tecnica_id);


--
-- Name: idx_solicitudes_partida_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_partida_id ON public.solicitudes USING btree (partida_id);


--
-- Name: idx_solicitudes_solicitante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_solicitante_id ON public.solicitudes USING btree (solicitante_id);


--
-- Name: idx_solicitudes_tipo_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_tipo_estado ON public.solicitudes USING btree (tipo, estado);


--
-- Name: idx_solicitudes_ubicacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_ubicacion ON public.solicitudes USING gist (ubicacion_solicitud);


--
-- Name: idx_stock_almacen_ubicacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_almacen_ubicacion_id ON public.stock_almacen USING btree (ubicacion_id);


--
-- Name: idx_stock_material; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_material ON public.stock_almacen USING btree (material_id);


--
-- Name: idx_trabajadores_frente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trabajadores_frente_id ON public.trabajadores USING btree (frente_id);


--
-- Name: idx_trabajadores_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trabajadores_obra_id ON public.trabajadores USING btree (obra_id);


--
-- Name: idx_transf_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transf_estado ON public.transferencias USING btree (estado);


--
-- Name: idx_transferencia_detalles_lote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_detalles_lote_id ON public.transferencia_detalles USING btree (lote_id);


--
-- Name: idx_transferencia_detalles_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_detalles_material_id ON public.transferencia_detalles USING btree (material_id);


--
-- Name: idx_transferencia_detalles_transferencia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_detalles_transferencia_id ON public.transferencia_detalles USING btree (transferencia_id);


--
-- Name: idx_transferencias_almacen_destino_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencias_almacen_destino_id ON public.transferencias USING btree (almacen_destino_id);


--
-- Name: idx_transferencias_almacen_origen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencias_almacen_origen_id ON public.transferencias USING btree (almacen_origen_id);


--
-- Name: idx_transferencias_aprobada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencias_aprobada_por ON public.transferencias USING btree (aprobada_por);


--
-- Name: idx_transferencias_creada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencias_creada_por ON public.transferencias USING btree (creada_por);


--
-- Name: idx_transferencias_despachado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencias_despachado_por ON public.transferencias USING btree (despachado_por);


--
-- Name: idx_transferencias_excedente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencias_excedente_id ON public.transferencias USING btree (excedente_id);


--
-- Name: idx_transferencias_recibido_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencias_recibido_por ON public.transferencias USING btree (recibido_por);


--
-- Name: idx_transferencias_solicitud_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencias_solicitud_id ON public.transferencias USING btree (solicitud_id);


--
-- Name: idx_transferencias_ubicacion_despacho; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencias_ubicacion_despacho ON public.transferencias USING gist (ubicacion_despacho);


--
-- Name: idx_transferencias_ubicacion_recepcion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencias_ubicacion_recepcion ON public.transferencias USING gist (ubicacion_recepcion);


--
-- Name: idx_transportes_orden_compra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transportes_orden_compra_id ON public.transportes USING btree (orden_compra_id);


--
-- Name: idx_transportes_transferencia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transportes_transferencia_id ON public.transportes USING btree (transferencia_id);


--
-- Name: idx_usuario_almacen_almacen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_almacen_almacen_id ON public.usuario_almacen USING btree (almacen_id);


--
-- Name: idx_usuario_obra_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_obra_obra_id ON public.usuario_obra USING btree (obra_id);


--
-- Name: idx_usuario_obra_rol_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_obra_rol_id ON public.usuario_obra USING btree (rol_id);


--
-- Name: idx_usuario_rol_rol_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_rol_rol_id ON public.usuario_rol USING btree (rol_id);


--
-- Name: idx_valorizaciones_aprobada_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_valorizaciones_aprobada_por ON public.valorizaciones USING btree (aprobada_por);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: solicitudes_acceso_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX solicitudes_acceso_email_index ON public.solicitudes_acceso USING btree (email);


--
-- Name: uq_parametro_vigente; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_parametro_vigente ON public.parametros_inventario USING btree (almacen_id, material_id) WHERE (vigente = true);


--
-- Name: kardex trg_kardex_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kardex_inmutable BEFORE DELETE OR UPDATE ON public.kardex FOR EACH ROW EXECUTE FUNCTION public.fn_kardex_inmutable();


--
-- Name: adelanto_eventos adelanto_eventos_adelanto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adelanto_eventos
    ADD CONSTRAINT adelanto_eventos_adelanto_id_foreign FOREIGN KEY (adelanto_id) REFERENCES public.adelantos(id) ON DELETE CASCADE;


--
-- Name: adelanto_eventos adelanto_eventos_usuario_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adelanto_eventos
    ADD CONSTRAINT adelanto_eventos_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: adelantos adelantos_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adelantos
    ADD CONSTRAINT adelantos_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: adelantos adelantos_registrado_por_financiera_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adelantos
    ADD CONSTRAINT adelantos_registrado_por_financiera_foreign FOREIGN KEY (registrado_por_financiera) REFERENCES public.usuarios(id);


--
-- Name: adelantos adelantos_solicitado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adelantos
    ADD CONSTRAINT adelantos_solicitado_por_foreign FOREIGN KEY (solicitado_por) REFERENCES public.usuarios(id);


--
-- Name: alertas alertas_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id);


--
-- Name: alertas alertas_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: alertas alertas_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: alertas alertas_reconocida_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_reconocida_por_foreign FOREIGN KEY (reconocida_por) REFERENCES public.usuarios(id);


--
-- Name: alertas alertas_transferencia_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_transferencia_id_foreign FOREIGN KEY (transferencia_id) REFERENCES public.transferencias(id);


--
-- Name: almacenes almacenes_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almacenes
    ADD CONSTRAINT almacenes_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: asistencias asistencias_aprobada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_aprobada_por_foreign FOREIGN KEY (aprobada_por) REFERENCES public.usuarios(id);


--
-- Name: asistencias asistencias_corregida_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_corregida_por_foreign FOREIGN KEY (corregida_por) REFERENCES public.usuarios(id);


--
-- Name: asistencias asistencias_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: asistencias asistencias_trabajador_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_trabajador_id_foreign FOREIGN KEY (trabajador_id) REFERENCES public.trabajadores(id);


--
-- Name: auditorias auditorias_usuario_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: avances_fisicos avances_fisicos_frente_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avances_fisicos
    ADD CONSTRAINT avances_fisicos_frente_id_foreign FOREIGN KEY (frente_id) REFERENCES public.frentes_trabajo(id);


--
-- Name: avances_fisicos avances_fisicos_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avances_fisicos
    ADD CONSTRAINT avances_fisicos_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;


--
-- Name: avances_fisicos avances_fisicos_partida_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avances_fisicos
    ADD CONSTRAINT avances_fisicos_partida_id_foreign FOREIGN KEY (partida_id) REFERENCES public.partidas(id);


--
-- Name: avances_fisicos avances_fisicos_registrado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avances_fisicos
    ADD CONSTRAINT avances_fisicos_registrado_por_foreign FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: capacitaciones capacitaciones_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacitaciones
    ADD CONSTRAINT capacitaciones_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: capacitaciones capacitaciones_programada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacitaciones
    ADD CONSTRAINT capacitaciones_programada_por_foreign FOREIGN KEY (programada_por) REFERENCES public.usuarios(id);


--
-- Name: cotizacion_detalles cotizacion_detalles_cotizacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_detalles
    ADD CONSTRAINT cotizacion_detalles_cotizacion_id_foreign FOREIGN KEY (cotizacion_id) REFERENCES public.cotizaciones(id) ON DELETE CASCADE;


--
-- Name: cotizacion_detalles cotizacion_detalles_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_detalles
    ADD CONSTRAINT cotizacion_detalles_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: cotizaciones cotizaciones_proveedor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_proveedor_id_foreign FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: cotizaciones cotizaciones_solicitud_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_solicitud_id_foreign FOREIGN KEY (solicitud_id) REFERENCES public.solicitudes(id);


--
-- Name: devolucion_detalles devolucion_detalles_devolucion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_detalles
    ADD CONSTRAINT devolucion_detalles_devolucion_id_foreign FOREIGN KEY (devolucion_id) REFERENCES public.devoluciones_proveedor(id) ON DELETE CASCADE;


--
-- Name: devolucion_detalles devolucion_detalles_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_detalles
    ADD CONSTRAINT devolucion_detalles_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: devolucion_detalles devolucion_detalles_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_detalles
    ADD CONSTRAINT devolucion_detalles_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: devoluciones_proveedor devoluciones_proveedor_aprobada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor
    ADD CONSTRAINT devoluciones_proveedor_aprobada_por_foreign FOREIGN KEY (aprobada_por) REFERENCES public.usuarios(id);


--
-- Name: devoluciones_proveedor devoluciones_proveedor_proveedor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor
    ADD CONSTRAINT devoluciones_proveedor_proveedor_id_foreign FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: devoluciones_proveedor devoluciones_proveedor_recepcion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor
    ADD CONSTRAINT devoluciones_proveedor_recepcion_id_foreign FOREIGN KEY (recepcion_id) REFERENCES public.recepciones(id);


--
-- Name: devoluciones_proveedor devoluciones_proveedor_registrada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor
    ADD CONSTRAINT devoluciones_proveedor_registrada_por_foreign FOREIGN KEY (registrada_por) REFERENCES public.usuarios(id);


--
-- Name: documentos documentos_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: documentos documentos_subido_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_subido_por_foreign FOREIGN KEY (subido_por) REFERENCES public.usuarios(id);


--
-- Name: epp_asignaciones epp_asignaciones_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epp_asignaciones
    ADD CONSTRAINT epp_asignaciones_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id);


--
-- Name: epp_asignaciones epp_asignaciones_entregado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epp_asignaciones
    ADD CONSTRAINT epp_asignaciones_entregado_por_foreign FOREIGN KEY (entregado_por) REFERENCES public.usuarios(id);


--
-- Name: epp_asignaciones epp_asignaciones_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epp_asignaciones
    ADD CONSTRAINT epp_asignaciones_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: epp_asignaciones epp_asignaciones_trabajador_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epp_asignaciones
    ADD CONSTRAINT epp_asignaciones_trabajador_id_foreign FOREIGN KEY (trabajador_id) REFERENCES public.trabajadores(id);


--
-- Name: excedentes_detectados excedentes_detectados_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excedentes_detectados
    ADD CONSTRAINT excedentes_detectados_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id);


--
-- Name: excedentes_detectados excedentes_detectados_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excedentes_detectados
    ADD CONSTRAINT excedentes_detectados_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: excedentes_detectados excedentes_detectados_obra_origen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excedentes_detectados
    ADD CONSTRAINT excedentes_detectados_obra_origen_id_foreign FOREIGN KEY (obra_origen_id) REFERENCES public.obras(id);


--
-- Name: kardex fk_kardex_lote; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kardex
    ADD CONSTRAINT fk_kardex_lote FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: solicitudes fk_sol_obs; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT fk_sol_obs FOREIGN KEY (observacion_tecnica_id) REFERENCES public.observaciones_tecnicas(id);


--
-- Name: transportes fk_transporte_transf; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportes
    ADD CONSTRAINT fk_transporte_transf FOREIGN KEY (transferencia_id) REFERENCES public.transferencias(id);


--
-- Name: frentes_trabajo frentes_trabajo_maestro_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frentes_trabajo
    ADD CONSTRAINT frentes_trabajo_maestro_obra_id_foreign FOREIGN KEY (maestro_obra_id) REFERENCES public.usuarios(id);


--
-- Name: frentes_trabajo frentes_trabajo_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frentes_trabajo
    ADD CONSTRAINT frentes_trabajo_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;


--
-- Name: hitos hitos_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos
    ADD CONSTRAINT hitos_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;


--
-- Name: incidentes incidentes_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidentes
    ADD CONSTRAINT incidentes_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: incidentes incidentes_reportado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidentes
    ADD CONSTRAINT incidentes_reportado_por_foreign FOREIGN KEY (reportado_por) REFERENCES public.usuarios(id);


--
-- Name: incidentes incidentes_reporte_tecnico_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidentes
    ADD CONSTRAINT incidentes_reporte_tecnico_id_foreign FOREIGN KEY (reporte_tecnico_id) REFERENCES public.documentos(id);


--
-- Name: incidentes incidentes_trabajador_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidentes
    ADD CONSTRAINT incidentes_trabajador_id_foreign FOREIGN KEY (trabajador_id) REFERENCES public.trabajadores(id);


--
-- Name: incidentes incidentes_validado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidentes
    ADD CONSTRAINT incidentes_validado_por_foreign FOREIGN KEY (validado_por) REFERENCES public.usuarios(id);


--
-- Name: inventario_fisico_detalles inventario_fisico_detalles_ajuste_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_fisico_detalles
    ADD CONSTRAINT inventario_fisico_detalles_ajuste_aprobado_por_foreign FOREIGN KEY (ajuste_aprobado_por) REFERENCES public.usuarios(id);


--
-- Name: inventario_fisico_detalles inventario_fisico_detalles_inventario_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_fisico_detalles
    ADD CONSTRAINT inventario_fisico_detalles_inventario_id_foreign FOREIGN KEY (inventario_id) REFERENCES public.inventarios_fisicos(id) ON DELETE CASCADE;


--
-- Name: inventario_fisico_detalles inventario_fisico_detalles_justificacion_revisada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_fisico_detalles
    ADD CONSTRAINT inventario_fisico_detalles_justificacion_revisada_por_foreign FOREIGN KEY (justificacion_revisada_por) REFERENCES public.usuarios(id);


--
-- Name: inventario_fisico_detalles inventario_fisico_detalles_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_fisico_detalles
    ADD CONSTRAINT inventario_fisico_detalles_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: inventarios_fisicos inventarios_fisicos_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios_fisicos
    ADD CONSTRAINT inventarios_fisicos_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id);


--
-- Name: inventarios_fisicos inventarios_fisicos_cerrado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios_fisicos
    ADD CONSTRAINT inventarios_fisicos_cerrado_por_foreign FOREIGN KEY (cerrado_por) REFERENCES public.usuarios(id);


--
-- Name: inventarios_fisicos inventarios_fisicos_programado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios_fisicos
    ADD CONSTRAINT inventarios_fisicos_programado_por_foreign FOREIGN KEY (programado_por) REFERENCES public.usuarios(id);


--
-- Name: kardex kardex_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kardex
    ADD CONSTRAINT kardex_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id);


--
-- Name: kardex kardex_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kardex
    ADD CONSTRAINT kardex_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: kardex kardex_usuario_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kardex
    ADD CONSTRAINT kardex_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: lineas_base_costo lineas_base_costo_aprobada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_base_costo
    ADD CONSTRAINT lineas_base_costo_aprobada_por_foreign FOREIGN KEY (aprobada_por) REFERENCES public.usuarios(id);


--
-- Name: lineas_base_costo lineas_base_costo_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_base_costo
    ADD CONSTRAINT lineas_base_costo_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;


--
-- Name: lotes lotes_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: lotes lotes_proveedor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_proveedor_id_foreign FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: marcaciones marcaciones_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marcaciones
    ADD CONSTRAINT marcaciones_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: marcaciones marcaciones_trabajador_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marcaciones
    ADD CONSTRAINT marcaciones_trabajador_id_foreign FOREIGN KEY (trabajador_id) REFERENCES public.trabajadores(id);


--
-- Name: material_proveedor material_proveedor_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_proveedor
    ADD CONSTRAINT material_proveedor_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id) ON DELETE CASCADE;


--
-- Name: material_proveedor material_proveedor_proveedor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_proveedor
    ADD CONSTRAINT material_proveedor_proveedor_id_foreign FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id) ON DELETE CASCADE;


--
-- Name: materiales materiales_categoria_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materiales
    ADD CONSTRAINT materiales_categoria_id_foreign FOREIGN KEY (categoria_id) REFERENCES public.categorias_material(id);


--
-- Name: materiales materiales_unidad_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materiales
    ADD CONSTRAINT materiales_unidad_id_foreign FOREIGN KEY (unidad_id) REFERENCES public.unidades_medida(id);


--
-- Name: mediciones_ambientales mediciones_ambientales_indicador_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mediciones_ambientales
    ADD CONSTRAINT mediciones_ambientales_indicador_id_foreign FOREIGN KEY (indicador_id) REFERENCES public.indicadores_ambientales(id);


--
-- Name: mediciones_ambientales mediciones_ambientales_medida_aplicada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mediciones_ambientales
    ADD CONSTRAINT mediciones_ambientales_medida_aplicada_por_foreign FOREIGN KEY (medida_aplicada_por) REFERENCES public.usuarios(id);


--
-- Name: mediciones_ambientales mediciones_ambientales_medido_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mediciones_ambientales
    ADD CONSTRAINT mediciones_ambientales_medido_por_foreign FOREIGN KEY (medido_por) REFERENCES public.usuarios(id);


--
-- Name: mediciones_ambientales mediciones_ambientales_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mediciones_ambientales
    ADD CONSTRAINT mediciones_ambientales_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: mermas mermas_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mermas
    ADD CONSTRAINT mermas_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id);


--
-- Name: mermas mermas_aprobada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mermas
    ADD CONSTRAINT mermas_aprobada_por_foreign FOREIGN KEY (aprobada_por) REFERENCES public.usuarios(id);


--
-- Name: mermas mermas_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mermas
    ADD CONSTRAINT mermas_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: mermas mermas_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mermas
    ADD CONSTRAINT mermas_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: mermas mermas_registrada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mermas
    ADD CONSTRAINT mermas_registrada_por_foreign FOREIGN KEY (registrada_por) REFERENCES public.usuarios(id);


--
-- Name: mermas mermas_transferencia_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mermas
    ADD CONSTRAINT mermas_transferencia_id_foreign FOREIGN KEY (transferencia_id) REFERENCES public.transferencias(id);


--
-- Name: notificaciones notificaciones_alerta_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_alerta_id_foreign FOREIGN KEY (alerta_id) REFERENCES public.alertas(id) ON DELETE SET NULL;


--
-- Name: notificaciones notificaciones_usuario_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: obra_fases obra_fases_aprobada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obra_fases
    ADD CONSTRAINT obra_fases_aprobada_por_foreign FOREIGN KEY (aprobada_por) REFERENCES public.usuarios(id);


--
-- Name: obra_fases obra_fases_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obra_fases
    ADD CONSTRAINT obra_fases_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;


--
-- Name: obras obras_acta_recepcion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_acta_recepcion_id_foreign FOREIGN KEY (acta_recepcion_id) REFERENCES public.documentos(id);


--
-- Name: obras obras_cerrado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_cerrado_por_foreign FOREIGN KEY (cerrado_por) REFERENCES public.usuarios(id);


--
-- Name: obras obras_informe_final_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_informe_final_id_foreign FOREIGN KEY (informe_final_id) REFERENCES public.documentos(id);


--
-- Name: obras obras_programa_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_programa_id_foreign FOREIGN KEY (programa_id) REFERENCES public.programas(id);


--
-- Name: obras obras_residente_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_residente_id_foreign FOREIGN KEY (residente_id) REFERENCES public.usuarios(id);


--
-- Name: observaciones_tecnicas observaciones_tecnicas_acta_levantamiento_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observaciones_tecnicas
    ADD CONSTRAINT observaciones_tecnicas_acta_levantamiento_id_foreign FOREIGN KEY (acta_levantamiento_id) REFERENCES public.documentos(id);


--
-- Name: observaciones_tecnicas observaciones_tecnicas_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observaciones_tecnicas
    ADD CONSTRAINT observaciones_tecnicas_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: observaciones_tecnicas observaciones_tecnicas_responsable_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observaciones_tecnicas
    ADD CONSTRAINT observaciones_tecnicas_responsable_id_foreign FOREIGN KEY (responsable_id) REFERENCES public.usuarios(id);


--
-- Name: orden_compra_detalles orden_compra_detalles_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_compra_detalles
    ADD CONSTRAINT orden_compra_detalles_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: orden_compra_detalles orden_compra_detalles_orden_compra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_compra_detalles
    ADD CONSTRAINT orden_compra_detalles_orden_compra_id_foreign FOREIGN KEY (orden_compra_id) REFERENCES public.ordenes_compra(id) ON DELETE CASCADE;


--
-- Name: ordenes_compra ordenes_compra_almacen_destino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT ordenes_compra_almacen_destino_id_foreign FOREIGN KEY (almacen_destino_id) REFERENCES public.almacenes(id);


--
-- Name: ordenes_compra ordenes_compra_cotizacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT ordenes_compra_cotizacion_id_foreign FOREIGN KEY (cotizacion_id) REFERENCES public.cotizaciones(id);


--
-- Name: ordenes_compra ordenes_compra_emitida_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT ordenes_compra_emitida_por_foreign FOREIGN KEY (emitida_por) REFERENCES public.usuarios(id);


--
-- Name: ordenes_compra ordenes_compra_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT ordenes_compra_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: ordenes_compra ordenes_compra_proveedor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT ordenes_compra_proveedor_id_foreign FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: ordenes_compra ordenes_compra_solicitud_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT ordenes_compra_solicitud_id_foreign FOREIGN KEY (solicitud_id) REFERENCES public.solicitudes(id);


--
-- Name: parametros_inventario parametros_inventario_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_inventario
    ADD CONSTRAINT parametros_inventario_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id) ON DELETE CASCADE;


--
-- Name: parametros_inventario parametros_inventario_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_inventario
    ADD CONSTRAINT parametros_inventario_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id) ON DELETE CASCADE;


--
-- Name: partidas partidas_frente_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidas
    ADD CONSTRAINT partidas_frente_id_foreign FOREIGN KEY (frente_id) REFERENCES public.frentes_trabajo(id);


--
-- Name: partidas partidas_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidas
    ADD CONSTRAINT partidas_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;


--
-- Name: permiso_rol permiso_rol_permiso_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_rol
    ADD CONSTRAINT permiso_rol_permiso_id_foreign FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE CASCADE;


--
-- Name: permiso_rol permiso_rol_rol_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_rol
    ADD CONSTRAINT permiso_rol_rol_id_foreign FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: planilla_detalles planilla_detalles_planilla_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planilla_detalles
    ADD CONSTRAINT planilla_detalles_planilla_id_foreign FOREIGN KEY (planilla_id) REFERENCES public.planillas(id) ON DELETE CASCADE;


--
-- Name: planilla_detalles planilla_detalles_trabajador_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planilla_detalles
    ADD CONSTRAINT planilla_detalles_trabajador_id_foreign FOREIGN KEY (trabajador_id) REFERENCES public.trabajadores(id);


--
-- Name: planillas planillas_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planillas
    ADD CONSTRAINT planillas_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: planillas planillas_procesada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planillas
    ADD CONSTRAINT planillas_procesada_por_foreign FOREIGN KEY (procesada_por) REFERENCES public.usuarios(id);


--
-- Name: pronosticos_demanda pronosticos_demanda_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pronosticos_demanda
    ADD CONSTRAINT pronosticos_demanda_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id) ON DELETE CASCADE;


--
-- Name: pronosticos_demanda pronosticos_demanda_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pronosticos_demanda
    ADD CONSTRAINT pronosticos_demanda_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id) ON DELETE CASCADE;


--
-- Name: recepcion_detalles recepcion_detalles_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_detalles
    ADD CONSTRAINT recepcion_detalles_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: recepcion_detalles recepcion_detalles_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_detalles
    ADD CONSTRAINT recepcion_detalles_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: recepcion_detalles recepcion_detalles_orden_compra_detalle_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_detalles
    ADD CONSTRAINT recepcion_detalles_orden_compra_detalle_id_foreign FOREIGN KEY (orden_compra_detalle_id) REFERENCES public.orden_compra_detalles(id);


--
-- Name: recepcion_detalles recepcion_detalles_recepcion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_detalles
    ADD CONSTRAINT recepcion_detalles_recepcion_id_foreign FOREIGN KEY (recepcion_id) REFERENCES public.recepciones(id) ON DELETE CASCADE;


--
-- Name: recepcion_detalles recepcion_detalles_ubicacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_detalles
    ADD CONSTRAINT recepcion_detalles_ubicacion_id_foreign FOREIGN KEY (ubicacion_id) REFERENCES public.ubicaciones_almacen(id);


--
-- Name: recepciones recepciones_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepciones
    ADD CONSTRAINT recepciones_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id);


--
-- Name: recepciones recepciones_almacenero_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepciones
    ADD CONSTRAINT recepciones_almacenero_id_foreign FOREIGN KEY (almacenero_id) REFERENCES public.usuarios(id);


--
-- Name: recepciones recepciones_orden_compra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepciones
    ADD CONSTRAINT recepciones_orden_compra_id_foreign FOREIGN KEY (orden_compra_id) REFERENCES public.ordenes_compra(id);


--
-- Name: residuos residuos_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residuos
    ADD CONSTRAINT residuos_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id);


--
-- Name: residuos residuos_manifiesto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residuos
    ADD CONSTRAINT residuos_manifiesto_id_foreign FOREIGN KEY (manifiesto_id) REFERENCES public.documentos(id);


--
-- Name: residuos residuos_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residuos
    ADD CONSTRAINT residuos_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: residuos residuos_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residuos
    ADD CONSTRAINT residuos_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: residuos residuos_proveedor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residuos
    ADD CONSTRAINT residuos_proveedor_id_foreign FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: residuos residuos_registrado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residuos
    ADD CONSTRAINT residuos_registrado_por_foreign FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: residuos residuos_transferencia_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residuos
    ADD CONSTRAINT residuos_transferencia_id_foreign FOREIGN KEY (transferencia_id) REFERENCES public.transferencias(id);


--
-- Name: riesgos riesgos_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riesgos
    ADD CONSTRAINT riesgos_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;


--
-- Name: riesgos riesgos_responsable_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riesgos
    ADD CONSTRAINT riesgos_responsable_id_foreign FOREIGN KEY (responsable_id) REFERENCES public.usuarios(id);


--
-- Name: solicitud_detalles solicitud_detalles_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_detalles
    ADD CONSTRAINT solicitud_detalles_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: solicitud_detalles solicitud_detalles_solicitud_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_detalles
    ADD CONSTRAINT solicitud_detalles_solicitud_id_foreign FOREIGN KEY (solicitud_id) REFERENCES public.solicitudes(id) ON DELETE CASCADE;


--
-- Name: solicitudes_acceso solicitudes_acceso_revisado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_acceso
    ADD CONSTRAINT solicitudes_acceso_revisado_por_foreign FOREIGN KEY (revisado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: solicitudes solicitudes_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id);


--
-- Name: solicitudes solicitudes_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.usuarios(id);


--
-- Name: solicitudes_cambio solicitudes_cambio_decidida_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_cambio
    ADD CONSTRAINT solicitudes_cambio_decidida_por_foreign FOREIGN KEY (decidida_por) REFERENCES public.usuarios(id);


--
-- Name: solicitudes_cambio solicitudes_cambio_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_cambio
    ADD CONSTRAINT solicitudes_cambio_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;


--
-- Name: solicitudes_cambio solicitudes_cambio_solicitada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_cambio
    ADD CONSTRAINT solicitudes_cambio_solicitada_por_foreign FOREIGN KEY (solicitada_por) REFERENCES public.usuarios(id);


--
-- Name: solicitudes solicitudes_frente_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_frente_id_foreign FOREIGN KEY (frente_id) REFERENCES public.frentes_trabajo(id);


--
-- Name: solicitudes solicitudes_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: solicitudes solicitudes_partida_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_partida_id_foreign FOREIGN KEY (partida_id) REFERENCES public.partidas(id);


--
-- Name: solicitudes solicitudes_solicitante_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_solicitante_id_foreign FOREIGN KEY (solicitante_id) REFERENCES public.usuarios(id);


--
-- Name: stock_almacen stock_almacen_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_almacen
    ADD CONSTRAINT stock_almacen_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id);


--
-- Name: stock_almacen stock_almacen_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_almacen
    ADD CONSTRAINT stock_almacen_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: stock_almacen stock_almacen_ubicacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_almacen
    ADD CONSTRAINT stock_almacen_ubicacion_id_foreign FOREIGN KEY (ubicacion_id) REFERENCES public.ubicaciones_almacen(id);


--
-- Name: trabajadores trabajadores_frente_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trabajadores
    ADD CONSTRAINT trabajadores_frente_id_foreign FOREIGN KEY (frente_id) REFERENCES public.frentes_trabajo(id);


--
-- Name: trabajadores trabajadores_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trabajadores
    ADD CONSTRAINT trabajadores_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: trabajadores trabajadores_persona_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trabajadores
    ADD CONSTRAINT trabajadores_persona_id_foreign FOREIGN KEY (persona_id) REFERENCES public.personas(id);


--
-- Name: transferencia_detalles transferencia_detalles_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_detalles
    ADD CONSTRAINT transferencia_detalles_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: transferencia_detalles transferencia_detalles_material_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_detalles
    ADD CONSTRAINT transferencia_detalles_material_id_foreign FOREIGN KEY (material_id) REFERENCES public.materiales(id);


--
-- Name: transferencia_detalles transferencia_detalles_transferencia_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_detalles
    ADD CONSTRAINT transferencia_detalles_transferencia_id_foreign FOREIGN KEY (transferencia_id) REFERENCES public.transferencias(id) ON DELETE CASCADE;


--
-- Name: transferencia_posiciones transferencia_posiciones_transferencia_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_posiciones
    ADD CONSTRAINT transferencia_posiciones_transferencia_id_foreign FOREIGN KEY (transferencia_id) REFERENCES public.transferencias(id) ON DELETE CASCADE;


--
-- Name: transferencias transferencias_almacen_destino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_almacen_destino_id_foreign FOREIGN KEY (almacen_destino_id) REFERENCES public.almacenes(id);


--
-- Name: transferencias transferencias_almacen_origen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_almacen_origen_id_foreign FOREIGN KEY (almacen_origen_id) REFERENCES public.almacenes(id);


--
-- Name: transferencias transferencias_aprobada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_aprobada_por_foreign FOREIGN KEY (aprobada_por) REFERENCES public.usuarios(id);


--
-- Name: transferencias transferencias_creada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_creada_por_foreign FOREIGN KEY (creada_por) REFERENCES public.usuarios(id);


--
-- Name: transferencias transferencias_despachado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_despachado_por_foreign FOREIGN KEY (despachado_por) REFERENCES public.usuarios(id);


--
-- Name: transferencias transferencias_excedente_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_excedente_id_foreign FOREIGN KEY (excedente_id) REFERENCES public.excedentes_detectados(id);


--
-- Name: transferencias transferencias_recibido_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_recibido_por_foreign FOREIGN KEY (recibido_por) REFERENCES public.usuarios(id);


--
-- Name: transferencias transferencias_solicitud_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias
    ADD CONSTRAINT transferencias_solicitud_id_foreign FOREIGN KEY (solicitud_id) REFERENCES public.solicitudes(id);


--
-- Name: transportes transportes_orden_compra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportes
    ADD CONSTRAINT transportes_orden_compra_id_foreign FOREIGN KEY (orden_compra_id) REFERENCES public.ordenes_compra(id);


--
-- Name: ubicaciones_almacen ubicaciones_almacen_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicaciones_almacen
    ADD CONSTRAINT ubicaciones_almacen_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id) ON DELETE CASCADE;


--
-- Name: usuario_almacen usuario_almacen_almacen_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_almacen
    ADD CONSTRAINT usuario_almacen_almacen_id_foreign FOREIGN KEY (almacen_id) REFERENCES public.almacenes(id) ON DELETE CASCADE;


--
-- Name: usuario_almacen usuario_almacen_usuario_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_almacen
    ADD CONSTRAINT usuario_almacen_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuario_obra usuario_obra_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_obra
    ADD CONSTRAINT usuario_obra_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;


--
-- Name: usuario_obra usuario_obra_rol_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_obra
    ADD CONSTRAINT usuario_obra_rol_id_foreign FOREIGN KEY (rol_id) REFERENCES public.roles(id);


--
-- Name: usuario_obra usuario_obra_usuario_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_obra
    ADD CONSTRAINT usuario_obra_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuario_rol usuario_rol_rol_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_rol_id_foreign FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: usuario_rol usuario_rol_usuario_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_usuario_id_foreign FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_persona_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_persona_id_foreign FOREIGN KEY (persona_id) REFERENCES public.personas(id) ON DELETE RESTRICT;


--
-- Name: valorizaciones valorizaciones_aprobada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valorizaciones
    ADD CONSTRAINT valorizaciones_aprobada_por_foreign FOREIGN KEY (aprobada_por) REFERENCES public.usuarios(id);


--
-- Name: valorizaciones valorizaciones_obra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valorizaciones
    ADD CONSTRAINT valorizaciones_obra_id_foreign FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--




-- Datos de migraciones
--
-- PostgreSQL database dump
--


-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path = public, extensions;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.migrations VALUES (1, '0001_01_01_000001_create_cache_table', 1);
INSERT INTO public.migrations VALUES (2, '0001_01_01_000002_create_jobs_table', 1);
INSERT INTO public.migrations VALUES (3, '2026_10_04_000001_habilitar_extension_postgis', 1);
INSERT INTO public.migrations VALUES (4, '2026_10_04_000002_crear_tablas_acceso_seguridad_sistema', 1);
INSERT INTO public.migrations VALUES (5, '2026_10_04_000003_crear_tablas_programa_obras_almacenes', 1);
INSERT INTO public.migrations VALUES (6, '2026_10_04_000004_crear_tablas_materiales_stock_kardex', 1);
INSERT INTO public.migrations VALUES (7, '2026_10_04_000005_crear_tablas_compras_proveedores', 1);
INSERT INTO public.migrations VALUES (8, '2026_10_04_000006_crear_tablas_logistica_geolocalizada', 1);
INSERT INTO public.migrations VALUES (9, '2026_10_04_000007_crear_tablas_gestion_proyecto_pmi', 1);
INSERT INTO public.migrations VALUES (10, '2026_10_04_000008_crear_tablas_personal_asistencia_sst', 1);
INSERT INTO public.migrations VALUES (11, '2026_10_04_000009_crear_tablas_calidad_ambiente_residuos', 1);
INSERT INTO public.migrations VALUES (12, '2026_10_04_000010_crear_tablas_notificaciones_funciones_vistas', 1);
INSERT INTO public.migrations VALUES (13, '2026_10_18_222910_crear_tabla_solicitudes_acceso', 1);
INSERT INTO public.migrations VALUES (14, '2026_10_18_231209_agregar_indice_auditorias_entidad_created', 1);
INSERT INTO public.migrations VALUES (15, '2026_10_19_000558_crear_tablas_fase_requisitos_criterios', 1);
INSERT INTO public.migrations VALUES (16, '2026_10_19_023202_agregar_ruc_a_solicitudes_acceso', 1);
INSERT INTO public.migrations VALUES (17, '2026_11_02_000001_crear_material_proveedor_y_demanda_diaria', 1);
INSERT INTO public.migrations VALUES (18, '2026_11_02_000002_crear_tablas_analitica', 1);
INSERT INTO public.migrations VALUES (19, '2026_11_02_000003_ampliar_tipo_incidentes', 1);
INSERT INTO public.migrations VALUES (20, '2026_11_02_000004_ampliar_destino_residuos', 1);
INSERT INTO public.migrations VALUES (21, '2026_11_02_000005_crear_tracking_despachos', 1);
INSERT INTO public.migrations VALUES (22, '2026_11_02_000006_agregar_uuid_marcaciones', 1);
INSERT INTO public.migrations VALUES (23, '2026_11_02_000007_crear_consumo_ruteo', 1);
INSERT INTO public.migrations VALUES (24, '2026_11_02_000008_agregar_latitud_longitud_geografia', 1);
INSERT INTO public.migrations VALUES (25, '2026_11_20_000001_agregar_checks_estados', 1);
INSERT INTO public.migrations VALUES (26, '2026_11_20_000002_agregar_indices_fk', 1);
INSERT INTO public.migrations VALUES (27, '2026_11_20_000003_indices_gist_geografia', 1);
INSERT INTO public.migrations VALUES (28, '2026_11_20_000004_comentarios_esquema', 1);
INSERT INTO public.migrations VALUES (29, '2026_11_20_000005_autovacuum_analitica', 1);
INSERT INTO public.migrations VALUES (30, '2026_11_20_000006_agregar_created_at_faltantes', 1);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 30, true);


--
-- PostgreSQL database dump complete
--


