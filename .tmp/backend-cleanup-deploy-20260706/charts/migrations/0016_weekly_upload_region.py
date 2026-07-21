# Generated for Ngoma Charts: adds country scoping to weekly uploads.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('charts', '0015_backfill_full_regional_candidate_pool'),
    ]

    operations = [
        migrations.AddField(
            model_name='weeklyupload',
            name='region',
            field=models.CharField(blank=True, default='KE', max_length=2),
        ),
        migrations.AlterUniqueTogether(
            name='weeklyupload',
            unique_together={('chart_type', 'year', 'month', 'week', 'region')},
        ),
    ]
