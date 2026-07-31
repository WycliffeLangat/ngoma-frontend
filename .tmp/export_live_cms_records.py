from pathlib import Path
import json

from rest_framework.renderers import JSONRenderer

from charts.cms_serializers import (
    BackupRecordSerializer,
    CertificationRuleSerializer,
    ChartUploadSerializer,
    CmsArtistSerializer,
    CmsCertificationSerializer,
    CmsCountrySerializer,
    CmsMonthlyChartSerializer,
    CmsNewsArticleSerializer,
    CmsPlatformSerializer,
    CmsReleaseSerializer,
    CmsWeeklyUploadSerializer,
    DataQualityIssueSerializer,
    MediaAssetSerializer,
    PageContentSerializer,
)
from charts.cms_views import (
    BackupRecordViewSet,
    CertificationRuleViewSet,
    ChartUploadViewSet,
    CmsArtistViewSet,
    CmsCertificationViewSet,
    CmsCountryViewSet,
    CmsMediaAssetViewSet,
    CmsMonthlyChartViewSet,
    CmsNewsArticleViewSet,
    CmsPageContentViewSet,
    CmsPlatformViewSet,
    CmsReleaseViewSet,
    CmsWeeklyUploadViewSet,
    DataQualityIssueViewSet,
)


def as_json(serializer):
    return json.loads(JSONRenderer().render(serializer.data))


release_qs = CmsReleaseViewSet.queryset
records = {
    "artists": as_json(CmsArtistSerializer(CmsArtistViewSet.queryset, many=True)),
    "songs": as_json(CmsReleaseSerializer(release_qs.filter(chart_type="singles"), many=True)),
    "albums": as_json(CmsReleaseSerializer(release_qs.filter(chart_type="albums"), many=True)),
    "countries": as_json(CmsCountrySerializer(CmsCountryViewSet.queryset, many=True)),
    "platforms": as_json(CmsPlatformSerializer(CmsPlatformViewSet.queryset, many=True)),
    "charts": as_json(CmsMonthlyChartSerializer(CmsMonthlyChartViewSet.queryset, many=True)),
    "chartUploads": as_json(ChartUploadSerializer(ChartUploadViewSet.queryset, many=True)),
    "weeklyUploads": as_json(CmsWeeklyUploadSerializer(CmsWeeklyUploadViewSet.queryset, many=True)),
    "certifications": as_json(CmsCertificationSerializer(CmsCertificationViewSet.queryset, many=True)),
    "certificationRules": as_json(CertificationRuleSerializer(CertificationRuleViewSet.queryset, many=True)),
    "news": as_json(CmsNewsArticleSerializer(CmsNewsArticleViewSet.queryset, many=True)),
    "pageContent": as_json(PageContentSerializer(CmsPageContentViewSet.queryset, many=True)),
    "media": as_json(MediaAssetSerializer(CmsMediaAssetViewSet.queryset, many=True)),
    "reports": as_json(DataQualityIssueSerializer(DataQualityIssueViewSet.queryset, many=True)),
    "backups": as_json(BackupRecordSerializer(BackupRecordViewSet.queryset, many=True)),
}

path = Path(r"C:\Users\HP\Desktop\Ngoma Charts Folder\files\ngoma_charts_backend\backend\.tmp\live_cms_records_post_featured_cleanup.json")
path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
print(json.dumps({key: len(value) for key, value in records.items()}, sort_keys=True))
print(path)
