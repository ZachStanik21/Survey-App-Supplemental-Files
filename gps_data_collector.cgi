#!/usr/bin/perl -ws                                                                       
use CGI;

my $query = CGI->new;

# Create outfile for saving data!

my $data = $query->param( 'POSTDATA' );

my ($id) = $data =~ /"partID":"(\d+)"/;

my $filename = "/data/participant_".$id."__gps_data.json";
open( OUTFILE, ">>$filename") or die $!, "Couldn\'t open outfile for reading!\n";

print OUTFILE $data;
close( OUTFILE );

1;