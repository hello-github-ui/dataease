package io.dataease.engine.utils;

import io.dataease.constant.SQLConstants;
import io.dataease.engine.constant.ExtFieldConstant;
import io.dataease.exception.DEException;
import io.dataease.extensions.datasource.api.PluginManageApi;
import io.dataease.extensions.datasource.constant.SqlPlaceholderConstants;
import io.dataease.extensions.datasource.dto.*;
import io.dataease.extensions.datasource.model.SQLObj;
import io.dataease.extensions.datasource.vo.DatasourceConfiguration;
import io.dataease.extensions.datasource.vo.XpackPluginsDatasourceVO;
import io.dataease.i18n.Translator;
import io.dataease.utils.JsonUtil;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.util.CollectionUtils;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class Utils {
    public static boolean joinSort(String sort) {
        return (StringUtils.equalsIgnoreCase(sort, "asc") || StringUtils.equalsIgnoreCase(sort, "desc"));
    }

    // 解析计算字段
    public static String calcFieldRegex(DatasetTableFieldDTO chartField, SQLObj tableObj, List<DatasetTableFieldDTO> originFields, boolean isCross, Map<Long, DatasourceSchemaDTO> dsMap, Map<String, String> paramMap, PluginManageApi pluginManage) {
        try {
            int i = 0;
            DsTypeDTO datasourceType = null;
            if (dsMap != null && dsMap.entrySet().iterator().hasNext()) {
                Map.Entry<Long, DatasourceSchemaDTO> next = dsMap.entrySet().iterator().next();
                datasourceType = getDs(pluginManage, next.getValue().getType());
            }
            return buildCalcField(chartField, tableObj, originFields, i, isCross, datasourceType, paramMap, true, chartField.getOriginName());
        } catch (Exception e) {
            DEException.throwException(Translator.get("i18n_field_circular_ref"));
        }
        return null;
    }

    public static String calcSimpleFieldRegex(DatasetTableFieldDTO chartField, SQLObj tableObj, List<DatasetTableFieldDTO> originFields, boolean isCross, Map<Long, String> dsTypeMap, PluginManageApi pluginManage) {
        try {
            int i = 0;
            DsTypeDTO datasourceType = null;
            if (dsTypeMap != null && dsTypeMap.entrySet().iterator().hasNext()) {
                Map.Entry<Long, String> next = dsTypeMap.entrySet().iterator().next();
                datasourceType = getDs(pluginManage, next.getValue());
            }
            return buildCalcField(chartField, tableObj, originFields, i, isCross, datasourceType, null, true, chartField.getOriginName());
        } catch (Exception e) {
            DEException.throwException(Translator.get("i18n_field_circular_ref"));
        }
        return null;
    }

    public static String buildCalcField(DatasetTableFieldDTO chartField, SQLObj tableObj, List<DatasetTableFieldDTO> originFields, int i, boolean isCross, DsTypeDTO datasourceType, Map<String, String> paramMap, boolean isFirst, String fieldExpression) throws Exception {
        try {
            i++;
            if (i > 100) {
                DEException.throwException(Translator.get("i18n_field_circular_error"));
            }
            String originField = getCalcField(chartField, originFields, isFirst, fieldExpression);
            originField = originField.replaceAll("[\\t\\n\\r]]", "");
            // 正则提取[xxx]
            String regex = "\\[(.*?)]";
            Pattern pattern = Pattern.compile(regex);
            Matcher matcher = pattern.matcher(originField);
            Set<String> ids = new HashSet<>();
            while (matcher.find()) {
                String id = matcher.group(1);
                ids.add(id);
            }
            if (CollectionUtils.isEmpty(ids)) {
                return originField;
            }
            // 替换参数
            if (ObjectUtils.isNotEmpty(paramMap)) {
                Set<Map.Entry<String, String>> entries = paramMap.entrySet();
                for (Map.Entry<String, String> ele : entries) {
                    originField = originField.replaceAll("\\[" + ele.getKey() + "]", ele.getValue());
                }
            }
            // 替换字段引用
            for (DatasetTableFieldDTO ele : originFields) {
                if (StringUtils.containsIgnoreCase(originField, ele.getId() + "")) {
                    // 计算字段允许二次引用，这里递归查询完整引用链
                    if (Objects.equals(ele.getExtField(), ExtFieldConstant.EXT_NORMAL)) {
                        if (isCross) {
                            originField = originField.replaceAll("\\[" + ele.getId() + "]", String.format(SQLConstants.FIELD_NAME, tableObj.getTableAlias(), ele.getDataeaseName()));
                        } else {
                            originField = originField.replaceAll("\\[" + ele.getId() + "]", datasourceType.getPrefix() + tableObj.getTableAlias() + datasourceType.getSuffix() + "." + datasourceType.getPrefix() + ele.getDataeaseName() + datasourceType.getSuffix());
                        }
                    } else {
                        originField = originField.replaceAll("\\[" + ele.getId() + "]", "(" + ele.getOriginName() + ")");
                        originField = buildCalcField(chartField, tableObj, originFields, i, isCross, datasourceType, paramMap, false, originField);
                    }
                }
            }
            return originField;
        } catch (Exception e) {
            DEException.throwException(Translator.get("i18n_field_circular_error"));
        }
        return null;
    }

    public static String getCalcField(DatasetTableFieldDTO ele, List<DatasetTableFieldDTO> originFields, boolean isFirst, String fieldExpression) {
        if (isFirst) {
            for (DatasetTableFieldDTO field : originFields) {
                if (Objects.equals(ele.getId(), field.getId())) {
                    return field.getOriginName();
                }
            }
            return "";
        } else {
            return fieldExpression;
        }
    }

    public static String getLogic(String logic) {
        if (logic != null) {
            switch (logic) {
                case "and":
                    return "AND";
                case "or":
                    return "OR";
            }
        }
        return "AND";
    }

    public static String transDateFormat(String dateStyle, String datePattern) {
        String split = "-";
        if (StringUtils.equalsIgnoreCase(datePattern, "date_sub")) {
            split = "-";
        } else if (StringUtils.equalsIgnoreCase(datePattern, "date_split")) {
            split = "/";
        } else {
            split = "-";
        }

        if (StringUtils.isEmpty(dateStyle)) {
            return "yyyy-MM-dd HH:mm:ss";
        }

        switch (dateStyle) {
            case "y":
                return "yyyy";
            case "y_Q":
                return "CONCAT(%s,'" + split + "',%s)";
            case "y_M":
                return "yyyy" + split + "MM";
            case "y_W":
                return "%Y" + split + "%u";
            case "y_M_d":
                return "yyyy" + split + "MM" + split + "dd";
            case "M_d":
                return "MM" + split + "dd";
            case "H_m_s":
                return "HH:mm:ss";
            case "y_M_d_H_m":
                return "yyyy" + split + "MM" + split + "dd" + " HH:mm";
            case "y_M_d_H_m_s":
                return "yyyy" + split + "MM" + split + "dd" + " HH:mm:ss";
            default:
                return "yyyy-MM-dd HH:mm:ss";
        }
    }

    public static String transFilterTerm(String term) {
        switch (term) {
            case "eq":
                return " = ";
            case "not_eq":
                return " <> ";
            case "lt":
                return " < ";
            case "le":
                return " <= ";
            case "gt":
                return " > ";
            case "ge":
                return " >= ";
            case "in":
                return " IN ";
            case "not in":
                return " NOT IN ";
            case "like":
                return " LIKE ";
            case "not like":
                return " NOT LIKE ";
            case "null":
                return " IS NULL ";
            case "not_null":
                return " IS NOT NULL ";
            case "empty":
                return " = ";
            case "not_empty":
                return " <> ";
            case "between":
                return " BETWEEN ";
            default:
                return "";
        }
    }

    public static void checkCircularReference(String originField, List<DatasetTableFieldDTO> fields) {
        originField = originField.replaceAll("[\\t\\n\\r]]", "");
        // 正则提取[xxx]
        String regex = "\\[(.*?)]";
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(originField);
        while (matcher.find()) {
            Set<String> ids = new HashSet<>();
            String id = matcher.group(1);
            for (DatasetTableFieldDTO ele : fields) {
                if (StringUtils.containsIgnoreCase(id, ele.getId() + "")) {
                    if (ids.contains(id)) {
                        DEException.throwException(Translator.get("i18n_field_circular_ref"));
                    }
                    ids.add(id);
                    if (Objects.equals(ele.getExtField(), ExtFieldConstant.EXT_CALC)) {
                        originField = originField.replaceAll("\\[" + ele.getId() + "]", ele.getOriginName());
                        checkField(ids, originField, fields);
                    }
                }
            }
        }
    }

    public static void checkField(Set<String> ids, String originField, List<DatasetTableFieldDTO> fields) {
        originField = originField.replaceAll("[\\t\\n\\r]]", "");
        // 正则提取[xxx]
        String regex = "\\[(.*?)]";
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(originField);
        while (matcher.find()) {
            String id = matcher.group(1);
            for (DatasetTableFieldDTO ele : fields) {
                if (StringUtils.containsIgnoreCase(id, ele.getId() + "")) {
                    if (ids.contains(id)) {
                        DEException.throwException(Translator.get("i18n_field_circular_ref"));
                    }
                    ids.add(id);
                    if (Objects.equals(ele.getExtField(), ExtFieldConstant.EXT_CALC)) {
                        originField = originField.replaceAll("\\[" + ele.getId() + "]", ele.getOriginName());
                        checkField(ids, originField, fields);
                    }
                }
            }
        }
    }

    public static boolean matchFunction(String func, String originField) {
        String pattern = func + "\\s*\\((.*?)\\)";
        Pattern r = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE);
        Matcher m = r.matcher(originField.replaceAll("[\\t\\n\\r]", ""));
        while (m.find()) {
            return true;
        }
        return false;
    }

    public static boolean isNeedOrder(List<String> dsList) {
        String[] list = {"sqlServer", "db2", "impala"};
        List<String> strings = Arrays.asList(list);
        List<String> collect = strings.stream().filter(dsList::contains).collect(Collectors.toList());
        return ObjectUtils.isNotEmpty(collect);
    }

    public static boolean isCrossDs(Map<Long, DatasourceSchemaDTO> dsMap) {
        return dsMap.size() != 1;
    }

    public static String replaceSchemaAlias(String sql, Map<Long, DatasourceSchemaDTO> dsMap) {
        DatasourceSchemaDTO value = dsMap.entrySet().iterator().next().getValue();
        Map map = JsonUtil.parseObject(value.getConfiguration(), Map.class);
        if (ObjectUtils.isNotEmpty(map.get("schema"))) {
            return sql;
        }
        return sql.replaceAll(SqlPlaceholderConstants.KEYWORD_PREFIX_REGEX + value.getSchemaAlias() + SqlPlaceholderConstants.KEYWORD_SUFFIX_REGEX + "\\.", "");
    }

    public static long allDateFormat2Long(String value) {
        String split = "-";
        if (value != null && value.contains("/")) {
            split = "/";
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy" + split + "MM" + split + "dd HH:mm:ss");
            return simpleDateFormat.parse(value).getTime();
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy" + split + "MM" + split + "dd HH:mm");
            return simpleDateFormat.parse(value).getTime();
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy" + split + "MM" + split + "dd HH");
            return simpleDateFormat.parse(value).getTime();
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("HH:mm:ss");
            return simpleDateFormat.parse(value).getTime();
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy" + split + "MM" + split + "dd");
            return simpleDateFormat.parse(value).getTime();
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy" + split + "MM");
            return simpleDateFormat.parse(value).getTime();
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy");
            return simpleDateFormat.parse(value).getTime();
        } catch (Exception e) {
        }
        return 0;
    }

    public static String parseTime(String time, String sourceFormat, String targetFormat) {
        if (StringUtils.equalsIgnoreCase(sourceFormat, targetFormat)) {
            String[] s = time.split(" ");
            if (s.length > 1) {
                time = s[1];
            } else {
                time = s[0];
            }
        }
        return time;
    }

    public static Map<String, Long> parseDateTimeValue(String value) {
        Map<String, Long> map = new LinkedHashMap<>();
        long startTime = 0;
        long endTime = 0;

        String split = "-";
        if (value != null && value.contains("/")) {
            split = "/";
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy" + split + "MM" + split + "dd HH:mm:ss");
            startTime = simpleDateFormat.parse(value).getTime();
            endTime = startTime + 999;

            map.put("startTime", startTime);
            map.put("endTime", endTime);
            return map;
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy" + split + "MM" + split + "dd HH:mm");
            startTime = simpleDateFormat.parse(value).getTime();
            endTime = startTime + (60 * 1000 - 1);

            map.put("startTime", startTime);
            map.put("endTime", endTime);
            return map;
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy" + split + "MM" + split + "dd HH");
            startTime = simpleDateFormat.parse(value).getTime();
            endTime = startTime + (60 * 60 * 1000 - 1);

            map.put("startTime", startTime);
            map.put("endTime", endTime);
            return map;
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("HH:mm:ss");
            startTime = simpleDateFormat.parse(value).getTime();
            endTime = startTime + 999;

            map.put("startTime", startTime);
            map.put("endTime", endTime);
            return map;
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy" + split + "MM" + split + "dd");
            startTime = simpleDateFormat.parse(value).getTime();
            endTime = startTime + (24 * 60 * 60 * 1000 - 1);

            map.put("startTime", startTime);
            map.put("endTime", endTime);
            return map;
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy" + split + "MM");
            Date parse = simpleDateFormat.parse(value);
            startTime = parse.getTime();
            Calendar calendar = Calendar.getInstance();
            calendar.setTime(parse);
            calendar.add(Calendar.MONTH, 1);
            endTime = calendar.getTime().getTime() - 1;

            map.put("startTime", startTime);
            map.put("endTime", endTime);
            return map;
        } catch (Exception e) {
        }
        try {
            SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy");
            Date parse = simpleDateFormat.parse(value);
            startTime = parse.getTime();
            Calendar calendar = Calendar.getInstance();
            calendar.setTime(parse);
            calendar.add(Calendar.YEAR, 1);
            endTime = calendar.getTime().getTime() - 1;

            map.put("startTime", startTime);
            map.put("endTime", endTime);
            return map;
        } catch (Exception e) {
        }

        map.put("startTime", startTime);
        map.put("endTime", endTime);
        return map;
    }

    public static String transLong2Str(Long ts) {
        Date date = new Date(ts);
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        return simpleDateFormat.format(date);
    }

    public static String transLong2StrShort(Long ts) {
        Date date = new Date(ts);
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd");
        return simpleDateFormat.format(date);
    }

    public static List<CalParam> getParams(List<DatasetTableFieldDTO> list) {
        if (ObjectUtils.isEmpty(list)) return Collections.emptyList();
        List<CalParam> param = new ArrayList<>();
        for (DatasetTableFieldDTO dto : list) {
            if (Objects.equals(dto.getExtField(), ExtFieldConstant.EXT_CALC) && ObjectUtils.isNotEmpty(dto.getParams())) {
                param.addAll(dto.getParams());
            }
        }
        return param;
    }

    public static Map<String, String> mergeParam(List<CalParam> fieldParam, List<CalParam> chartParam) {
        Map<String, String> map = new HashMap<>();
        if (ObjectUtils.isNotEmpty(fieldParam)) {
            for (CalParam param : fieldParam) {
                map.put(param.getId(), param.getValue());
            }
        }
        if (ObjectUtils.isNotEmpty(chartParam)) {
            for (CalParam param : chartParam) {
                map.put(param.getId(), param.getValue());
            }
        }
        return map;
    }

    private static DsTypeDTO getDs(PluginManageApi pluginManage, String type) {
        DsTypeDTO dto = new DsTypeDTO();
        try {
            DatasourceConfiguration.DatasourceType datasourceType = DatasourceConfiguration.DatasourceType.valueOf(type);
            dto.setType(type);
            dto.setName(datasourceType.getName());
            dto.setCatalog(datasourceType.getCatalog());
            dto.setPrefix(datasourceType.getPrefix());
            dto.setSuffix(datasourceType.getSuffix());
            return dto;
        } catch (Exception e) {
            List<XpackPluginsDatasourceVO> xpackPluginsDatasourceVOS = pluginManage.queryPluginDs();
            for (XpackPluginsDatasourceVO vo : xpackPluginsDatasourceVOS) {
                if (StringUtils.equalsIgnoreCase(vo.getType(), type)) {
                    dto.setType(type);
                    dto.setName(vo.getName());
                    dto.setCatalog(vo.getCategory());
                    dto.setPrefix(vo.getPrefix());
                    dto.setSuffix(vo.getSuffix());
                    return dto;
                }
            }
        }
        return null;
    }

    public static String transGroupFieldToSql(DatasetTableFieldDTO dto, List<DatasetTableFieldDTO> fields, boolean isCross, Map<Long, DatasourceSchemaDTO> dsMap, PluginManageApi pluginManage) {
        // 从fields里取最新的dto
        for (DatasetTableFieldDTO fieldDTO : fields) {
            if (Objects.equals(dto.getId(), fieldDTO.getId())) {
                dto.setGroupList(fieldDTO.getGroupList());
                dto.setOtherGroup(fieldDTO.getOtherGroup());
                break;
            }
        }
        // get origin field
        DatasetTableFieldDTO originField = null;
        for (DatasetTableFieldDTO ele : fields) {
            if (Objects.equals(ele.getId(), Long.valueOf(dto.getOriginName()))) {
                originField = ele;
                break;
            }
        }
        if (originField == null) {
            DEException.throwException("Field not exists");
        }

        DsTypeDTO datasourceType = null;
        if (dsMap != null && dsMap.entrySet().iterator().hasNext()) {
            Map.Entry<Long, DatasourceSchemaDTO> next = dsMap.entrySet().iterator().next();
            datasourceType = getDs(pluginManage, next.getValue().getType());
        }
        if (datasourceType == null) {
            DEException.throwException("Datasource not exists");
        }

        String fieldName;
        if (isCross) {
            fieldName = originField.getDataeaseName();
        } else {
            fieldName = datasourceType.getPrefix() + originField.getDataeaseName() + datasourceType.getSuffix();
        }

        StringBuilder exp = new StringBuilder();
        exp.append(" (CASE ");
        if (originField.getDeType() == 0) {
            for (FieldGroupDTO fieldGroupDTO : dto.getGroupList()) {
                exp.append(" WHEN ");
                for (int i = 0; i < fieldGroupDTO.getText().size(); i++) {
                    String value = fieldGroupDTO.getText().get(i);
                    exp.append(fieldName).append(" = ").append("'").append(transValue(value)).append("'");
                    if (i < fieldGroupDTO.getText().size() - 1) {
                        exp.append(" OR ");
                    }
                }
                exp.append(" THEN '").append(transValue(fieldGroupDTO.getName())).append("'");
            }
        } else if (originField.getDeType() == 1) {
            for (FieldGroupDTO fieldGroupDTO : dto.getGroupList()) {
                exp.append(" WHEN ");
                exp.append(fieldName).append(" >= ").append("'").append(fieldGroupDTO.getStartTime()).append("'");
                exp.append(" AND ");
                exp.append(fieldName).append(" <= ").append("'").append(fieldGroupDTO.getEndTime()).append("'");
                exp.append(" THEN '").append(transValue(fieldGroupDTO.getName())).append("'");
            }
        } else if (originField.getDeType() == 2 || originField.getDeType() == 3 || originField.getDeType() == 4) {
            for (FieldGroupDTO fieldGroupDTO : dto.getGroupList()) {
                exp.append(" WHEN ");
                exp.append(fieldName).append(StringUtils.equalsIgnoreCase(fieldGroupDTO.getMinTerm(), "le") ? " >= " : " > ").append(fieldGroupDTO.getMin());
                exp.append(" AND ");
                exp.append(fieldName).append(StringUtils.equalsIgnoreCase(fieldGroupDTO.getMaxTerm(), "le") ? " <= " : " < ").append(fieldGroupDTO.getMax());
                exp.append(" THEN '").append(transValue(fieldGroupDTO.getName())).append("'");
            }
        }
        exp.append(" ELSE ").append("'").append(transValue(dto.getOtherGroup())).append("'").append(" END) ");
        return exp.toString();
    }

    public static String transValue(String value) {
        return value.replace("\\", "\\\\").replace("'", "''");
    }
}
