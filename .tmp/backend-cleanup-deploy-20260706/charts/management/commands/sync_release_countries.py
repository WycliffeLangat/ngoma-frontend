"""One-off backfill: set every release's country/country_code to match its main artist.

Going forward this invariant is enforced live by CmsReleaseSerializer.validate() and
CmsArtistSerializer.update() (see cms_serializers.py). This command exists to fix
historical rows that were saved before that rule existed.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from charts.cms_utils import harmonize_chart_history
from charts.models import MonthlyChartEntry, Release


class Command(BaseCommand):
    help = "Backfill Release.country/country_code from each release's main (primary) artist."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without saving anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        mismatched = []
        for release in Release.objects.select_related("artist").iterator():
            artist = release.artist
            if release.country != artist.country or release.country_code != artist.country_code:
                mismatched.append(release)

        if not dry_run:
            with transaction.atomic():
                release_ids = [release.id for release in mismatched]
                for release in mismatched:
                    release.country = release.artist.country
                    release.country_code = release.artist.country_code
                Release.objects.bulk_update(mismatched, ["country", "country_code"], batch_size=500)
            if release_ids:
                chart_ids = list(
                    MonthlyChartEntry.objects.filter(release_id__in=release_ids)
                    .values_list("chart_id", flat=True).distinct()
                )
                if chart_ids:
                    harmonize_chart_history(chart_ids=chart_ids)

        mode = "DRY RUN" if dry_run else "APPLIED"
        self.stdout.write(self.style.SUCCESS(
            f"{mode}: {len(mismatched)} release(s) had a country mismatched with their main artist."
        ))
        if dry_run and mismatched:
            for release in mismatched[:20]:
                self.stdout.write(
                    f"  #{release.id} {release.title!r} — "
                    f"release={release.country!r}/{release.country_code!r}, "
                    f"artist={release.artist.country!r}/{release.artist.country_code!r}"
                )
            if len(mismatched) > 20:
                self.stdout.write(f"  ...and {len(mismatched) - 20} more.")
