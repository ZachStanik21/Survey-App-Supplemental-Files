#!/usr/bin/perl -ws                                                                       
use CGI;

my $query = CGI->new;
my $data = $query->param( 'POSTDATA' );

print $query->header;

# Create outfile for saving data!

my $start = index $data, "participant_id";

if ($start == -1) {
	die "no participant ID";
}

my ($id) = $data =~ m/"participant_id":"(\d+)",/;

my $filename = "/data/participant_".$id."_data.csv";
open( OUTFILE, ">>$filename") or die $!, "Couldn\'t open outfile for reading!\n";

print OUTFILE $data;
close( OUTFILE );

1;